import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeInstanceEntry, instanceLedgerKeyXdr } from "../src/rpc.js";
import { instanceEntryB64, vaultStorage, contractIdFromSeed, accountFromSeed } from "./helpers.js";

test("instance key encodes contract data with instance key", () => {
  const cid = contractIdFromSeed(1);
  assert.equal(typeof instanceLedgerKeyXdr(cid), "string");
  assert.equal(instanceLedgerKeyXdr(cid), instanceLedgerKeyXdr(cid));
});

test("decodes wasm hash and keeps full storage keys", () => {
  const cid = contractIdFromSeed(2);
  const b64 = instanceEntryB64({ contractId: cid, wasmByte: 9, storage: vaultStorage({ manager: accountFromSeed(3), emergency: accountFromSeed(4) }) });
  const { wasmHash, storage } = decodeInstanceEntry(b64);
  assert.equal(wasmHash, Buffer.alloc(32, 9).toString("hex"));
  const names = storage.map((e) => e.name);
  assert.ok(names.includes("Manager"));
  assert.ok(names.includes("Upgradable"));
  const strat = storage.filter((e) => e.name === "AssetStrategySet");
  assert.equal(strat.length, 1);
  assert.deepEqual(strat[0].key, ["AssetStrategySet", 0]);
});
