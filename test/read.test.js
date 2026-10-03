import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "../src/read.js";
import { instanceEntryB64, vaultStorage, contractIdFromSeed, accountFromSeed, fakeNetwork, horizonAccount, keyFor } from "./helpers.js";

const cfg = { rpcUrl: "https://rpc.test", horizonUrl: "https://horizon.test", explorerBase: "https://explorer.test" };
const VAULT = contractIdFromSeed(10);
const MGR = accountFromSeed(11);
const EMG = accountFromSeed(12);
const contract = { id: "fixture-vault", protocol: "Fixture", role: "vault", contractId: VAULT, source: "synthetic fixture", fields: [
  { key: "Manager", type: "address" }, { key: "EmergencyManager", type: "address" }, { key: "Upgradable", type: "bool" }, { key: "AssetStrategySet", type: "strategies" },
]};

test("every field carries a source with contract, storage key and ledger", async () => {
  const net = fakeNetwork({
    latestLedger: 777,
    instances: { [VAULT]: instanceEntryB64({ contractId: VAULT, storage: vaultStorage({ manager: MGR, emergency: EMG }) }) },
    accounts: { [MGR]: horizonAccount({ thresholds: [2, 2, 2], signers: [{ key: accountFromSeed(21), weight: 1, type: "ed25519_public_key" }, { key: accountFromSeed(22), weight: 1, type: "ed25519_public_key" }, { key: accountFromSeed(23), weight: 1, type: "ed25519_public_key" }] }) },
  });
  const r = await buildReport(contract, cfg, { fetchImpl: net });
  assert.equal(r.ledger.sequence, 777);
  for (const f of r.fields) {
    assert.equal(f.source.contractId, VAULT);
    assert.equal(f.source.ledger, 777);
    assert.ok(f.source.url.startsWith("https://explorer.test/contract/"));
  }
  const mgr = r.fields.find((f) => f.name === "Manager");
  assert.equal(mgr.value, MGR);
  assert.equal(r.fields.find((f) => f.name === "Upgradable").value, false);
  const strat = r.fields.find((f) => f.type === "strategies");
  assert.equal(strat.value[0].paused, true);
});

test("Horizon accounts are reported with thresholds, signers and their source", async () => {
  const net = fakeNetwork({
    instances: { [VAULT]: instanceEntryB64({ contractId: VAULT, storage: vaultStorage({ manager: MGR, emergency: EMG }) }) },
    accounts: { [MGR]: horizonAccount({ thresholds: [2, 2, 2], signers: [{ key: accountFromSeed(21), weight: 1, type: "ed25519_public_key" }] }), [EMG]: horizonAccount({ signers: [{ key: EMG, weight: 1, type: "ed25519_public_key" }] }) },
  });
  const r = await buildReport(contract, cfg, { fetchImpl: net });
  const acct = r.accounts.find((a) => a.address === MGR);
  assert.equal(acct.thresholds.medium, 2);
  assert.equal(acct.signers.length, 1);
  assert.ok(acct.source.url.startsWith("https://horizon.test/accounts/"));
  assert.ok(r.accounts.find((a) => a.address === EMG));
});

test("a missing storage key is reported as null with a note, not dropped", async () => {
  const net = fakeNetwork({ instances: { [VAULT]: instanceEntryB64({ contractId: VAULT, storage: [] }) } });
  const r = await buildReport(contract, cfg, { fetchImpl: net });
  const mgr = r.fields.find((f) => f.name === "Manager");
  assert.equal(mgr.value, null);
  assert.match(mgr.note, /not present/);
});

test("unknown contract id yields NOT_FOUND", async () => {
  const net = fakeNetwork({ instances: {} });
  await assert.rejects(buildReport(contract, cfg, { fetchImpl: net }), (e) => e.code === "NOT_FOUND");
});
