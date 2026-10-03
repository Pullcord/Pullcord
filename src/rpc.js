// Read-only Soroban RPC access. Uses getLedgerEntries only; never sends a
// transaction and never calls simulateTransaction (which needs an account).
import { xdr, scValToNative, StrKey } from "@stellar/stellar-sdk";

// Storage key of a contract instance entry: LedgerKey(ContractData, instance, persistent).
export function instanceLedgerKeyXdr(contractId) {
  const hash = StrKey.decodeContract(contractId);
  const key = new xdr.LedgerKeyContractData({
    contract: xdr.ScAddress.scAddressTypeContract(hash),
    key: xdr.ScVal.scvLedgerKeyContractInstance(),
    durability: xdr.ContractDataDurability.persistent(),
  });
  return xdr.LedgerKey.contractData(key).toXDR("base64");
}

export function keyName(scVal) {
  const native = scValToNative(scVal);
  return Array.isArray(native) ? String(native[0]) : String(native);
}

// Decodes a base64 LedgerEntryData that holds a contract instance.
export function decodeInstanceEntry(xdrB64) {
  const data = xdr.LedgerEntryData.fromXDR(xdrB64, "base64");
  const instance = data.contractData().val().instance();
  const exec = instance.executable();
  const wasmHash = exec.switch().name === "contractExecutableWasm" ? exec.wasmHash().toString("hex") : null;
  // Keep the full key (native form) so keys like ["AssetStrategySet", 0] are not collapsed.
  const storage = (instance.storage() || []).map((entry) => {
    const key = scValToNative(entry.key());
    return { name: keyName(entry.key()), key, val: entry.val() };
  });
  return { wasmHash, storage };
}

export async function getContractInstance(contractId, { rpcUrl, fetchImpl = fetch }) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getLedgerEntries",
    params: { keys: [instanceLedgerKeyXdr(contractId)] },
  };
  const res = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  const { entries = [], latestLedger } = json.result;
  if (entries.length === 0) {
    const err = new Error("contract instance not found on this network");
    err.code = "NOT_FOUND";
    throw err;
  }
  const entry = entries[0];
  return {
    ledger: latestLedger,
    liveUntilLedgerSeq: entry.liveUntilLedgerSeq ?? null,
    ...decodeInstanceEntry(entry.xdr),
  };
}
