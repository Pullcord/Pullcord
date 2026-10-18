import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { xdr, Address, nativeToScVal } from "@stellar/stellar-sdk";
import {
  consentRefFromNonce,
  consentLedgerKeyXdr,
  decodeConsentEntry,
  readConsent,
  makeConsentGate,
} from "../src/notify/consent.js";
import { openStore } from "../src/notify/store.js";
import { pollOnce } from "../src/notify/watcher.js";
import { loadConfig } from "../src/config.js";
import { accountFromSeed, contractIdFromSeed } from "./helpers.js";

const OWNER = accountFromSeed(31);
const REGISTRY = contractIdFromSeed(77);
const REF = createHash("sha256").update("x").digest("hex");

// The value the contract stores: Consent { ledger: u32, status: Status } where a unit
// enum variant is a vec [Symbol]. Keys of a struct map are sorted: ledger, status.
function consentEntry(status, ledger = 7) {
  const val = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: nativeToScVal("ledger", { type: "symbol" }), val: nativeToScVal(ledger, { type: "u32" }) }),
    new xdr.ScMapEntry({ key: nativeToScVal("status", { type: "symbol" }), val: xdr.ScVal.scvVec([nativeToScVal(status, { type: "symbol" })]) }),
  ]);
  const entry = new xdr.ContractDataEntry({
    ext: xdr.ExtensionPoint.fromXDR(Buffer.from([0, 0, 0, 0])),
    contract: new Address(REGISTRY).toScAddress(),
    key: xdr.ScVal.scvVoid(),
    durability: xdr.ContractDataDurability.persistent(),
    val,
  });
  return xdr.LedgerEntryData.contractData(entry).toXDR("base64");
}

const fakeRegistry = (table) => async (_url, init) => {
  const key = JSON.parse(init.body).params.keys[0];
  const hit = Object.entries(table).find(([k]) => k === key);
  return Response.json({ jsonrpc: "2.0", id: 1, result: { entries: hit ? [{ xdr: hit[1] }] : [], latestLedger: 10 } });
};

test("consent reference: deterministic, derived from the nonce, no personal data", () => {
  assert.equal(consentRefFromNonce("abc"), createHash("sha256").update("pullcord:consent:abc").digest("hex"));
  assert.notEqual(consentRefFromNonce("abc"), consentRefFromNonce("abd"));
  assert.match(consentRefFromNonce("abc"), /^[0-9a-f]{64}$/);
});

test("ledger key encodes DataKey::Consent(owner, reference) as vec [Symbol, Address, Bytes]", () => {
  const k = xdr.LedgerKey.fromXDR(consentLedgerKeyXdr(REGISTRY, OWNER, REF), "base64").contractData();
  assert.equal(k.durability().name, "persistent");
  const parts = k.key().vec();
  assert.equal(parts.length, 3);
  assert.equal(parts[0].sym().toString(), "Consent");
  assert.equal(Address.fromScVal(parts[1]).toString(), OWNER);
  assert.equal(parts[2].bytes().toString("hex"), REF);
});

test("decodes Active and Revoked entries", () => {
  assert.deepEqual(decodeConsentEntry(consentEntry("Active", 12)), { status: "Active", ledger: 12 });
  assert.deepEqual(decodeConsentEntry(consentEntry("Revoked", 40)), { status: "Revoked", ledger: 40 });
});

test("readConsent: returns the record, null when never registered, and throws on RPC errors", async () => {
  const keyA = consentLedgerKeyXdr(REGISTRY, OWNER, REF);
  const net = fakeRegistry({ [keyA]: consentEntry("Active") });
  const base = { rpcUrl: "https://rpc.test", contractId: REGISTRY, owner: OWNER, reference: REF };
  assert.deepEqual(await readConsent({ ...base, fetchImpl: net }), { status: "Active", ledger: 7 });
  const other = createHash("sha256").update("y").digest("hex");
  assert.equal(await readConsent({ ...base, reference: other, fetchImpl: net }), null);
  await assert.rejects(readConsent({ ...base, fetchImpl: async () => new Response("no", { status: 500 }) }), /RPC HTTP 500/);
  await assert.rejects(readConsent({ ...base, fetchImpl: async () => Response.json({ error: { message: "boom" } }) }), /RPC error: boom/);
});

test("gate: revoked stops delivery; unregistered G keeps working; unregistered C stops; RPC failure does not silence alerts; reads are cached", async () => {
  const cfg = { consentContractId: REGISTRY, notifyRpcUrl: "https://rpc.test" };
  let reads = 0;
  const gate = makeConsentGate(cfg, { read: async () => { reads++; return { status: "Active" }; }, ttlMs: 1000, now: () => 0 });
  const g = { address: OWNER, consent_ref: REF, ownership_proof: "sep53" };
  const c = { address: OWNER, consent_ref: REF, ownership_proof: "onchain-consent" };
  assert.equal(await makeConsentGate(cfg)({ address: OWNER, consent_ref: null }), "ok", "no reference: nothing to check");
  assert.equal(await gate(g), "ok");
  assert.equal(await gate(g), "ok");
  assert.equal(reads, 1, "second call is cached");
  assert.equal(await makeConsentGate(cfg, { read: async () => ({ status: "Revoked" }) })(g), "revoked");
  assert.equal(await makeConsentGate(cfg, { read: async () => null })(g), "ok", "SEP-53 subscription that never used the registry");
  assert.equal(await makeConsentGate(cfg, { read: async () => null })(c), "revoked", "contract-address subscription needs consent");
  assert.equal(await makeConsentGate(cfg, { read: async () => { throw new Error("down"); } })(c), "ok", "an RPC outage must not silence alerts");
});

// ---- watcher: a revocation on chain deletes the subscription and its data, and nothing is delivered
function transfer({ id, ledger = 100, to }) {
  const topics = [nativeToScVal("transfer", { type: "symbol" }), new Address(accountFromSeed(12)).toScVal(), new Address(to).toScVal(), nativeToScVal("native", { type: "string" })];
  return { id, ledger, ledgerClosedAt: "2026-10-18T00:00:00Z", txHash: "ab".repeat(32), contractId: contractIdFromSeed(20), type: "contract", inSuccessfulContractCall: true, topic: topics.map((t) => t.toXDR("base64")), value: nativeToScVal(25_000_000n, { type: "i128" }).toXDR("base64") };
}
const rpcWith = (events) => async (_u, init) => {
  const body = JSON.parse(init.body);
  if (body.method === "getLatestLedger") return Response.json({ jsonrpc: "2.0", id: 1, result: { sequence: 100 } });
  return Response.json({ jsonrpc: "2.0", id: 1, result: { events, cursor: events.at(-1)?.id ?? "c0", latestLedger: 100 } });
};

test("watcher: consent revoked on chain deletes the subscription and does not deliver", async () => {
  const cfg = { ...loadConfig({}), allowHttpWebhooks: true, pageLimit: 5, maxPagesPerPoll: 2 };
  const store = openStore();
  const sub = store.create({ address: OWNER, events: ["payment.received"], channel: "webhook", webhookUrl: "http://127.0.0.1:9/hook", ownershipProof: "sep53", consentRef: REF });
  const logs = [];
  const n = await pollOnce(cfg, { store, log: (m) => logs.push(m), consentGate: async () => "revoked", fetchImpl: rpcWith([transfer({ id: "e1", to: OWNER })]) });
  assert.equal(n, 0);
  assert.equal(store.get(sub.id), null, "subscription and its personal data are gone");
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM deliveries").get().n, 0, "nothing was delivered");
  assert.ok(logs.some((l) => /consent revoked on chain/.test(l)));
});

test("store: consent_ref is saved with the subscription", () => {
  const store = openStore();
  const s = store.create({ address: OWNER, events: ["payment.received"], channel: "webhook", webhookUrl: "https://a.example/h", ownershipProof: "onchain-consent", consentRef: REF });
  assert.equal(store.get(s.id).consent_ref, REF);
  assert.equal(store.get(s.id).ownership_proof, "onchain-consent");
});
