import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { nativeToScVal, Address } from "@stellar/stellar-sdk";
import { decodeTransfer, formatAmount } from "../src/notify/events.js";
import { openStore } from "../src/notify/store.js";
import { pollOnce } from "../src/notify/watcher.js";
import { checkWebhookUrl } from "../src/notify/routes.js";
import { handleUpdate } from "../src/notify/telegram.js";
import { createApp } from "../src/server.js";
import { loadConfig } from "../src/config.js";
import { sign, verify } from "../packages/notify/signature.js";
import { Pullcord } from "../packages/notify/index.js";
import { accountFromSeed, contractIdFromSeed } from "./helpers.js";

const ALICE = accountFromSeed(11);
const BOB = accountFromSeed(12);
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

test("webhook URLs: https only, no internal hosts", () => {
  assert.equal(checkWebhookUrl("https://app.example/hook"), null);
  assert.ok(checkWebhookUrl("http://app.example/hook"));
  for (const u of ["https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x", "https://192.168.1.1/x", "https://169.254.169.254/x", "https://[::1]/x", "https://svc.railway.internal/x"]) {
    assert.ok(checkWebhookUrl(u), u);
  }
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

test("API and client: subscribe, read, unsubscribe", async () => {
  const store = openStore();
  const app = await createApp({ ...cfg, rpcUrl: "https://rpc.test" }, { store, telegramUsername: "pullcord_test_bot" });
  const { server, url } = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}` })); });
  const pc = new Pullcord({ url });

  const hook = await pc.subscribe({ address: BOB, channel: { webhook: "https://app.example/hook" } });
  assert.ok(hook.secret && hook.manageToken);
  const tg = await pc.subscribe({ address: SAC, channel: { telegram: true } });
  assert.match(tg.telegramLink, /^https:\/\/t\.me\/pullcord_test_bot\?start=/);
  assert.equal(tg.secret, undefined);

  assert.equal((await pc.get(hook.id, hook.manageToken)).address, BOB);
  await assert.rejects(pc.get(hook.id, "wrong"), { status: 404 });
  await assert.rejects(pc.subscribe({ address: "GNOTVALID", channel: { telegram: true } }), { status: 400 });
  await assert.rejects(pc.subscribe({ contract: SAC, channel: { telegram: true } }), { status: 501 });
  await assert.rejects(pc.subscribe({ address: BOB, events: ["anything"], channel: { telegram: true } }), { status: 400 });

  await pc.unsubscribe(hook.id, hook.manageToken);
  assert.equal(store.get(hook.id), null);
  server.close();
});
