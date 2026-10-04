import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { nativeToScVal, Address, Keypair } from "@stellar/stellar-sdk";
import { decodeTransfer, formatAmount } from "../src/notify/events.js";
import { openStore } from "../src/notify/store.js";
import { pollOnce } from "../src/notify/watcher.js";
import { checkWebhookUrl } from "../src/notify/routes.js";
import { isBlockedIp, safePost, assertPublicHost } from "../src/notify/ssrf.js";
import { postWebhook } from "../src/notify/dispatch.js";
import { handleUpdate } from "../src/notify/telegram.js";
import { createApp } from "../src/server.js";
import { loadConfig } from "../src/config.js";
import { sign, verify } from "../packages/notify/signature.js";
import { Pullcord } from "../packages/notify/index.js";
import { accountFromSeed, contractIdFromSeed } from "./helpers.js";

const ALICE = accountFromSeed(11);
const BOB = accountFromSeed(12);
const BOB_KEY = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 12)); // synthetic; BOB_KEY.publicKey() === BOB
const ALICE_KEY = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 11)); // synthetic; ALICE_KEY.publicKey() === ALICE
const SAC = contractIdFromSeed(20);

// Synthetic RPC event shaped like CAP-67 `transfer`.
function rpcTransfer({ id, ledger = 100, from = ALICE, to = BOB, asset = "native", amount = 25_000_000n, muxedId = null }) {
  const topics = [nativeToScVal("transfer", { type: "symbol" }), new Address(from).toScVal(), new Address(to).toScVal()];
  if (asset !== null) topics.push(nativeToScVal(asset, { type: "string" }));
  const value = muxedId === null
    ? nativeToScVal(amount, { type: "i128" })
    : nativeToScVal({ amount, to_muxed_id: muxedId }, { type: { amount: ["symbol", "i128"], to_muxed_id: ["symbol", "u64"] } });
  return { id, ledger, ledgerClosedAt: "2026-10-04T00:00:00Z", txHash: "ab".repeat(32), contractId: SAC, type: "contract", inSuccessfulContractCall: true, topic: topics.map((t) => t.toXDR("base64")), value: value.toXDR("base64") };
}

// Fake RPC: getLatestLedger plus getEvents served from a list, paged by cursor.
function fakeRpc(events, { latest = 100 } = {}) {
  const calls = [];
  const fn = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    if (body.method === "getLatestLedger") return Response.json({ jsonrpc: "2.0", id: 1, result: { sequence: latest } });
    const after = body.params.pagination?.cursor;
    const start = after ? events.findIndex((e) => e.id === after) + 1 : events.findIndex((e) => e.ledger >= body.params.startLedger);
    const page = start < 0 ? [] : events.slice(start, start + body.params.pagination.limit);
    const cursor = page.length ? page.at(-1).id : after ?? "c0";
    return Response.json({ jsonrpc: "2.0", id: 1, result: { events: page, cursor, latestLedger: latest } });
  };
  fn.calls = calls;
  return fn;
}

const cfg = { ...loadConfig({}), allowHttpWebhooks: true, pageLimit: 2, maxPagesPerPoll: 10 };

async function listen(handler) {
  const server = createServer(handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

test("decodes SAC transfers, muxed destinations and plain SEP-41 tokens", () => {
  const sac = decodeTransfer(rpcTransfer({ id: "1" }));
  assert.equal(sac.from, ALICE);
  assert.equal(sac.to, BOB);
  assert.equal(sac.asset, "native");
  assert.equal(sac.amount, "25000000");
  assert.equal(formatAmount(sac), "2.5");

  const muxed = decodeTransfer(rpcTransfer({ id: "2", muxedId: 42n }));
  assert.equal(muxed.amount, "25000000");
  assert.equal(muxed.toMuxedId, "42");

  const token = decodeTransfer(rpcTransfer({ id: "3", asset: null }));
  assert.equal(token.asset, null);
  assert.equal(formatAmount(token), null); // decimals unknown for non-SAC tokens

  assert.equal(decodeTransfer({ ...rpcTransfer({ id: "4" }), inSuccessfulContractCall: false }), null);
});

test("signature verifies, and rejects tampering, wrong secret and stale timestamps", () => {
  const body = '{"a":1}';
  const header = sign("s3cret", body);
  assert.ok(verify({ "pullcord-signature": header }, body, "s3cret"));
  assert.ok(verify(new Headers({ "Pullcord-Signature": header }), body, "s3cret"));
  assert.equal(verify({ "pullcord-signature": header }, '{"a":2}', "s3cret"), false);
  assert.equal(verify({ "pullcord-signature": header }, body, "other"), false);
  const old = sign("s3cret", body, Math.floor(Date.now() / 1000) - 3600);
  assert.equal(verify({ "pullcord-signature": old }, body, "s3cret"), false);
  assert.equal(verify({}, body, "s3cret"), false);
});

test("store: deleting a subscription removes its personal data", () => {
  const store = openStore();
  const tg = store.create({ address: BOB, events: ["payment.received"], channel: "telegram" });
  assert.equal(store.byAddress(BOB).length, 0, "unlinked telegram subscriptions are not delivered");
  store.linkTelegram(tg.telegramLinkToken, 777);
  assert.equal(store.byAddress(BOB)[0].telegram_chat_id, "777");
  assert.equal(store.linkTelegram(tg.telegramLinkToken, 888), null, "link tokens are single use");
  assert.equal(store.authorize(tg.id, "wrong"), null);
  assert.ok(store.authorize(tg.id, tg.manageToken));
  assert.ok(store.claimDelivery("e1", tg.id));
  assert.equal(store.claimDelivery("e1", tg.id), false);
  store.delete(tg.id);
  const left = store.db.prepare("SELECT COUNT(*) AS n FROM subscriptions WHERE telegram_chat_id = '777'").get().n;
  assert.equal(left, 0);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM deliveries").get().n, 0);
});

test("watcher: delivers a signed webhook once per payment, across pages and restarts", async () => {
  const received = [];
  const { server, url } = await listen(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    received.push({ headers: req.headers, raw });
    res.writeHead(200).end();
  });
  const store = openStore();
  const sub = store.create({ address: BOB, events: ["payment.received"], channel: "webhook", webhookUrl: `${url}/hook` });
  const events = [
    rpcTransfer({ id: "e1", ledger: 100, to: ALICE, from: BOB }), // not for BOB
    rpcTransfer({ id: "e2", ledger: 100 }),
    rpcTransfer({ id: "e3", ledger: 101, asset: "USDC:" + accountFromSeed(30), amount: 10_000_000n }),
  ];
  const rpc = fakeRpc(events);

  assert.equal(await pollOnce(cfg, { store, fetchImpl: async (u, i) => (String(u).startsWith(url) ? fetch(u, i) : rpc(u, i)) }), 2);
  assert.equal(received.length, 2);
  for (const r of received) assert.ok(verify(r.headers, r.raw, sub.webhookSecret));
  const usdc = JSON.parse(received[1].raw);
  assert.equal(usdc.type, "payment.received");
  assert.equal(usdc.payment.amountDecimal, "1");
  assert.equal(usdc.payment.asset.split(":")[0], "USDC");
  assert.match(usdc.source.explorer, /\/tx\/ab/);

  // Second poll resumes from the saved cursor: nothing is delivered twice.
  assert.equal(await pollOnce(cfg, { store, fetchImpl: async (u, i) => (String(u).startsWith(url) ? fetch(u, i) : rpc(u, i)) }), 0);
  assert.equal(received.length, 2);
  server.close();
});

test("watcher: a failing webhook is retried and recorded as failed", async () => {
  let hits = 0;
  const { server, url } = await listen((req, res) => { hits++; res.writeHead(500).end(); });
  const store = openStore();
  const sub = store.create({ address: BOB, events: ["payment.received"], channel: "webhook", webhookUrl: url });
  const rpc = fakeRpc([rpcTransfer({ id: "e9" })]);
  await pollOnce(cfg, { store, retryDelayMs: 1, fetchImpl: async (u, i) => (String(u).startsWith(url) ? fetch(u, i) : rpc(u, i)) });
  assert.equal(hits, 3);
  const d = store.db.prepare("SELECT status, attempts FROM deliveries WHERE subscription_id = ?").get(sub.id);
  assert.equal(d.status, "failed");
  assert.equal(d.attempts, 3);
  server.close();
});

test("telegram: /start links the chat, /stop deletes it", async () => {
  const store = openStore();
  const sub = store.create({ address: BOB, events: ["payment.received"], channel: "telegram" });
  const sent = [];
  const fetchImpl = async (u, i) => { sent.push(JSON.parse(i.body)); return Response.json({ ok: true, result: {} }); };
  await handleUpdate({ message: { chat: { id: 5 }, text: `/start ${sub.telegramLinkToken}` } }, { store, token: "t", fetchImpl });
  assert.equal(store.get(sub.id).telegram_chat_id, "5");
  assert.match(sent[0].text, /Listo/);
  await handleUpdate({ message: { chat: { id: 5 }, text: "/stop" } }, { store, token: "t", fetchImpl });
  assert.equal(store.get(sub.id), null);
});

// --- SSRF -----------------------------------------------------------------

// Fake DNS: maps names to address lists, like dns.lookup(..., { all: true }).
const fakeDns = (table) => (host, _opts, cb) =>
  table[host] ? cb(null, table[host].map((address) => ({ address, family: address.includes(":") ? 6 : 4 }))) : cb(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }));

test("ssrf: private, loopback, link-local and metadata addresses are blocked (IPv4 and IPv6)", () => {
  for (const ip of [
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1",
    "::1", "::", "fe80::1", "fc00::1", "fd00:ec2::254", "fdaa::3", "ff02::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "64:ff9b::a9fe:a9fe",
  ]) assert.equal(isBlockedIp(ip), true, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) assert.equal(isBlockedIp(ip), false, ip);
  assert.equal(isBlockedIp("not-an-ip"), true);
});

test("ssrf: a domain that resolves to 127.0.0.1 is refused at delivery and never reached", async () => {
  let hits = 0;
  const { server } = await listen((req, res) => { hits++; res.writeHead(200).end(); });
  const port = server.address().port;
  const resolve = fakeDns({ "evil.example": ["127.0.0.1"] });
  await assert.rejects(safePost(`http://evil.example:${port}/hook`, { headers: {}, body: "{}", resolve }), { code: "EBLOCKEDHOST" });
  // Same name through the real delivery path: not retried, recorded as blocked.
  const r = await postWebhook(`http://evil.example:${port}/hook`, "s", { a: 1 }, { resolve, baseDelayMs: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.attempts, 1);
  assert.match(r.error, /blocked address \(127\.0\.0\.1\)/);
  // Real DNS: "localhost" resolves to loopback and is refused too.
  await assert.rejects(safePost(`http://localhost:${port}/hook`, { headers: {}, body: "{}" }), { code: "EBLOCKEDHOST" });
  // Literal IPs skip DNS and are checked directly.
  await assert.rejects(safePost(`http://127.0.0.1:${port}/hook`, { headers: {}, body: "{}" }), { code: "EBLOCKEDHOST" });
  await assert.rejects(safePost(`http://[::1]:${port}/hook`, { headers: {}, body: "{}" }), { code: "EBLOCKEDHOST" });
  assert.equal(hits, 0);
  server.close();
});

test("ssrf: one private address in a multi-address answer blocks the host", async () => {
  await assert.rejects(assertPublicHost("mixed.example", { resolve: fakeDns({ "mixed.example": ["93.184.215.14", "10.0.0.7"] }) }), { code: "EBLOCKEDHOST" });
  await assert.doesNotReject(assertPublicHost("ok.example", { resolve: fakeDns({ "ok.example": ["93.184.215.14"] }) }));
});

test("ssrf: DNS rebinding after subscription is caught at delivery", async () => {
  let calls = 0;
  const rebinding = (host, opts, cb) => fakeDns({ [host]: [calls++ === 0 ? "93.184.215.14" : "169.254.169.254"] })(host, opts, cb);
  assert.equal(await checkWebhookUrl("https://rebind.example/hook", { resolve: rebinding }), null); // public at subscribe time
  const r = await postWebhook("https://rebind.example/hook", "s", {}, { resolve: rebinding, baseDelayMs: 1 });
  assert.equal(r.ok, false);
  assert.match(r.error, /169\.254\.169\.254/);
});

test("ssrf: redirects are not followed", async () => {
  let targetHits = 0;
  const target = await listen((req, res) => { targetHits++; res.writeHead(200).end(); });
  const redirector = await listen((req, res) => { res.writeHead(302, { Location: `${target.url}/internal` }).end(); });
  const r = await postWebhook(`${redirector.url}/hook`, "s", {}, { allowPrivate: true, baseDelayMs: 1 });
  assert.equal(r.ok, false);
  assert.match(r.error, /redirect not followed/);
  assert.equal(targetHits, 0);
  target.server.close();
  redirector.server.close();
});

test("ssrf: subscribe-time checks reject internal hosts, IPs and credentials", async () => {
  const resolve = fakeDns({ "app.example": ["93.184.215.14"], "internal.example": ["10.0.0.5"] });
  assert.equal(await checkWebhookUrl("https://app.example/hook", { resolve }), null);
  assert.equal(await checkWebhookUrl("http://app.example/hook", { resolve }), "webhook must use https");
  assert.equal(await checkWebhookUrl("https://internal.example/hook", { resolve }), "webhook host is not allowed");
  assert.equal(await checkWebhookUrl("https://user:pw@app.example/hook", { resolve }), "webhook must not contain credentials");
  for (const u of ["https://127.0.0.1/x", "https://169.254.169.254/x", "https://[::1]/x", "https://[fd00:ec2::254]/x", "https://[::ffff:127.0.0.1]/x"]) {
    assert.equal(await checkWebhookUrl(u, { resolve }), "webhook host is not allowed", u);
  }
  assert.match(await checkWebhookUrl("https://nx.example/hook", { resolve }), /does not resolve/);
});

// --- Ownership (SEP-53) and API --------------------------------------------

async function apiServer(extraCfg = {}) {
  const store = openStore();
  const resolve = fakeDns({ "app.example": ["93.184.215.14"] });
  const app = await createApp({ ...cfg, allowHttpWebhooks: false, rpcUrl: "https://rpc.test", ...extraCfg }, { store, telegramUsername: "pullcord_test_bot", resolve });
  const { server, url } = await new Promise((ok) => { const s = app.listen(0, "127.0.0.1", () => ok({ server: s, url: `http://127.0.0.1:${s.address().port}` })); });
  return { store, server, url, pc: new Pullcord({ url }) };
}
const post = (url, path, body) => fetch(`${url}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("ownership: a G subscription needs a valid SEP-53 signature over a fresh, single-use challenge", async () => {
  const { store, server, url, pc } = await apiServer();
  const channel = { webhook: "https://app.example/hook" };

  // No proof: rejected.
  assert.equal((await post(url, "/v1/subscriptions", { address: BOB, channel })).status, 401);
  // Client without signMessage refuses before calling the API.
  await assert.rejects(pc.subscribe({ address: BOB, channel }), /signMessage is required/);

  // Valid proof.
  const sub = await pc.subscribe({ address: BOB, channel, signMessage: (m) => BOB_KEY.signMessage(m) });
  assert.equal(sub.ownershipProof, "sep53");
  assert.ok(sub.secret && sub.manageToken);

  // Signed by another key: rejected.
  const c1 = await (await post(url, "/v1/subscriptions/challenge", { address: BOB })).json();
  assert.match(c1.message, /does not move funds/);
  const wrong = Keypair.random().signMessage(c1.message).toString("base64");
  assert.equal((await post(url, "/v1/subscriptions", { address: BOB, channel, proof: { nonce: c1.nonce, signature: wrong } })).status, 401);
  // The nonce was consumed by the failed attempt: the right signature no longer works.
  const right = BOB_KEY.signMessage(c1.message).toString("base64");
  assert.equal((await post(url, "/v1/subscriptions", { address: BOB, channel, proof: { nonce: c1.nonce, signature: right } })).status, 401);

  // A challenge for one address cannot be used for another.
  const c2 = await (await post(url, "/v1/subscriptions/challenge", { address: ALICE })).json();
  assert.equal((await post(url, "/v1/subscriptions", { address: BOB, channel, proof: { nonce: c2.nonce, signature: BOB_KEY.signMessage(c2.message).toString("base64") } })).status, 401);

  // Expired challenge.
  const c3 = await (await post(url, "/v1/subscriptions/challenge", { address: BOB })).json();
  store.db.prepare("UPDATE challenges SET expires_at = 0 WHERE nonce = ?").run(c3.nonce);
  assert.equal((await post(url, "/v1/subscriptions", { address: BOB, channel, proof: { nonce: c3.nonce, signature: BOB_KEY.signMessage(c3.message).toString("hex") } })).status, 401);

  // Replay of a nonce that already succeeded.
  const c4 = await (await post(url, "/v1/subscriptions/challenge", { address: BOB })).json();
  const proof = { nonce: c4.nonce, signature: BOB_KEY.signMessage(c4.message).toString("base64") };
  assert.equal((await post(url, "/v1/subscriptions", { address: BOB, channel, proof })).status, 201);
  assert.equal((await post(url, "/v1/subscriptions", { address: BOB, channel, proof })).status, 401);
  server.close();
});

test("ownership: C addresses are testnet-only and marked unverified; refused on other networks", async () => {
  const t = await apiServer();
  const sub = await t.pc.subscribe({ address: SAC, channel: { telegram: true } });
  assert.equal(sub.ownershipProof, "none");
  assert.match(sub.warning, /testnet only/);
  assert.match(sub.telegramLink, /^https:\/\/t\.me\/pullcord_test_bot\?start=/);
  t.server.close();

  const m = await apiServer({ notifyNetwork: "mainnet" });
  await assert.rejects(m.pc.subscribe({ address: SAC, channel: { telegram: true } }), { status: 403 });
  m.server.close();
});

test("API and client: read, validation errors, unsubscribe", async () => {
  const { store, server, pc } = await apiServer();
  const signMessage = (m) => BOB_KEY.signMessage(m);
  const hook = await pc.subscribe({ address: BOB, channel: { webhook: "https://app.example/hook" }, signMessage });
  assert.equal((await pc.get(hook.id, hook.manageToken)).address, BOB);
  await assert.rejects(pc.get(hook.id, "wrong"), { status: 404 });
  await assert.rejects(pc.subscribe({ address: "XNOTVALID", channel: { telegram: true } }), { status: 400 });
  await assert.rejects(pc.subscribe({ contract: SAC, channel: { telegram: true } }), { status: 501 });
  await assert.rejects(pc.subscribe({ address: SAC, events: ["anything"], channel: { telegram: true } }), { status: 400 });
  await assert.rejects(pc.subscribe({ address: BOB, channel: { webhook: "https://127.0.0.1/x" }, signMessage }), { status: 400 });
  await pc.unsubscribe(hook.id, hook.manageToken);
  assert.equal(store.get(hook.id), null);
  server.close();
});

test("appLabel: stored, returned, validated, and counted only once sent", async () => {
  const { store, server, pc } = await apiServer();
  const signMessage = (m) => BOB_KEY.signMessage(m);

  // No appLabel: fine, stays null.
  const noLabel = await pc.subscribe({ address: BOB, channel: { webhook: "https://app.example/hook" }, signMessage });
  assert.equal(noLabel.appLabel, null);

  // Rejects personal-looking or oversized labels.
  await assert.rejects(pc.subscribe({ address: BOB, channel: { telegram: true }, signMessage, appLabel: "a".repeat(41) }), { status: 400 });
  await assert.rejects(pc.subscribe({ address: BOB, channel: { telegram: true }, signMessage, appLabel: "mañana" }), { status: 400 }); // non-ASCII
  await assert.rejects(pc.subscribe({ address: BOB, channel: { telegram: true }, signMessage, appLabel: 42 }), { status: 400 });

  // A valid label is stored and echoed back.
  const withLabel = await pc.subscribe({ address: BOB, channel: { telegram: true }, signMessage, appLabel: "  mi-app  " });
  assert.equal(withLabel.appLabel, "mi-app"); // trimmed
  assert.equal(store.get(withLabel.id).app_label, "mi-app");

  // Before any delivery, the app doesn't count yet.
  assert.deepEqual(store.stats(), { appsIntegrated: 0, subscriptions: 2, notificationsSent: 0 });

  // One sent delivery makes the appLabel count; a second subscription with the
  // SAME label does not double-count it.
  store.claimDelivery("ev1", withLabel.id);
  store.finishDelivery("ev1", withLabel.id, "sent", 1);
  const second = await pc.subscribe({ address: ALICE, channel: { telegram: true }, appLabel: "mi-app", signMessage: (m) => ALICE_KEY.signMessage(m) });
  assert.deepEqual(store.stats(), { appsIntegrated: 1, subscriptions: 3, notificationsSent: 1 });

  // A different app with a failed (not sent) delivery doesn't count.
  const other = await pc.subscribe({ address: ALICE, channel: { telegram: true }, appLabel: "otra-app", signMessage: (m) => ALICE_KEY.signMessage(m) });
  store.claimDelivery("ev2", other.id);
  store.finishDelivery("ev2", other.id, "failed", 3);
  assert.deepEqual(store.stats(), { appsIntegrated: 1, subscriptions: 4, notificationsSent: 1 });

  // A third distinct app with a sent delivery reaches the 9-oct criterion (>= 3).
  const third = await pc.subscribe({ address: ALICE, channel: { telegram: true }, appLabel: "tercera-app", signMessage: (m) => ALICE_KEY.signMessage(m) });
  store.claimDelivery("ev3", third.id);
  store.finishDelivery("ev3", third.id, "sent", 1);
  assert.equal(store.stats().appsIntegrated, 2); // "otra-app" still has no sent delivery

  server.close();
});

test("GET /v1/subscriptions/stats is aggregate-only (no labels, addresses or secrets) and never matches :id", async () => {
  const { store, server, url } = await apiServer();
  const sub = store.create({ address: BOB, events: ["payment.received"], channel: "telegram", appLabel: "visible-app" });
  store.linkTelegram(sub.telegramLinkToken, 1);
  store.claimDelivery("evX", sub.id);
  store.finishDelivery("evX", sub.id, "sent", 1);

  const res = await fetch(`${url}/v1/subscriptions/stats`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { appsIntegrated: 1, subscriptions: 1, notificationsSent: 1 });
  assert.equal(JSON.stringify(body).includes("visible-app"), false);
  assert.equal(JSON.stringify(body).includes(BOB), false);
  server.close();
});
