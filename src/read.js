// Builds a sourced report for one registry contract. Every value carries the
// source it came from (contract storage key and ledger, or Horizon account).
import { scValToNative } from "@stellar/stellar-sdk";
import { getContractInstance } from "./rpc.js";
import { getAccount } from "./horizon.js";
import { isAccountId } from "./strkey.js";

const contractUrl = (cfg, id) => `${cfg.explorerBase}/contract/${id}`;
const accountUrl = (cfg, id) => `${cfg.explorerBase}/account/${id}`;

export async function buildReport(contract, cfg, { fetchImpl = fetch } = {}) {
  const inst = await getContractInstance(contract.contractId, { rpcUrl: cfg.rpcUrl, fetchImpl });
  const src = (storageKey) => ({
    kind: "contract-storage",
    contractId: contract.contractId,
    storageKey,
    ledger: inst.ledger,
    url: contractUrl(cfg, contract.contractId),
  });

  const fields = [];
  const accountIds = new Set();

  for (const spec of contract.fields) {
    const entries = inst.storage.filter((e) => e.name === spec.key);
    if (spec.type === "strategies") {
      for (const e of entries) {
        const strategies = (scValToNative(e.val).strategies || []).map((s) => ({
          address: s.address,
          name: s.name,
          paused: Boolean(s.paused),
        }));
        fields.push({ name: spec.key, index: e.key[1] ?? null, type: "strategies", value: strategies, source: src(spec.key) });
      }
      continue;
    }
    if (entries.length === 0) {
      fields.push({ name: spec.key, type: spec.type, value: null, source: src(spec.key), note: "key not present in instance storage" });
      continue;
    }
    const value = scValToNative(entries[0].val);
    if (spec.type === "address" && isAccountId(String(value))) accountIds.add(String(value));
    fields.push({ name: spec.key, type: spec.type, value: spec.type === "address" ? String(value) : Boolean(value), source: src(spec.key) });
  }

  const accounts = [];
  for (const id of accountIds) {
    const acct = await getAccount(id, { horizonUrl: cfg.horizonUrl, fetchImpl });
    accounts.push({
      address: id,
      ...acct,
      source: {
        kind: "horizon-account",
        url: `${cfg.horizonUrl.replace(/\/$/, "")}/accounts/${id}`,
        explorer: accountUrl(cfg, id),
        fetchedAt: new Date().toISOString(),
      },
    });
  }

  return {
    contract: {
      id: contract.id,
      protocol: contract.protocol,
      role: contract.role,
      contractId: contract.contractId,
      registrySource: contract.source,
      explorer: contractUrl(cfg, contract.contractId),
    },
    ledger: { sequence: inst.ledger, rpcUrl: cfg.rpcUrl, liveUntilLedgerSeq: inst.liveUntilLedgerSeq },
    wasm: inst.wasmHash ? { hash: inst.wasmHash, source: { kind: "contract-instance", contractId: contract.contractId, ledger: inst.ledger, url: contractUrl(cfg, contract.contractId) } } : null,
    fields,
    accounts,
  };
}
