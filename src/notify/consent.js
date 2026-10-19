// On-chain consent registry (contracts/consent-registry). The owner of an
// address records, with their own signature, that Pullcord may monitor it for
// one subscription reference; they can revoke it at any time. This module only
// READS the registry through getLedgerEntries: it never sends a transaction.
//
// The reference is sha256("pullcord:consent:" + nonce), where the nonce is the
// single-use value the server issued. No webhook URL, chat ID or any other
// personal data is ever written to the chain.
import { createHash } from "node:crypto";
import { xdr, Address, scValToNative, nativeToScVal } from "@stellar/stellar-sdk";

export const consentRefFromNonce = (nonce) =>
  createHash("sha256").update(`pullcord:consent:${nonce}`).digest("hex");

// Storage key of DataKey::Consent(owner, reference): persistent, ScVal vec [Symbol, Address, Bytes].
export function consentLedgerKeyXdr(contractId, owner, refHex) {
  const key = xdr.ScVal.scvVec([
    nativeToScVal("Consent", { type: "symbol" }),
    new Address(owner).toScVal(),
    xdr.ScVal.scvBytes(Buffer.from(refHex, "hex")),
  ]);
  const data = new xdr.LedgerKeyContractData({
    contract: new Address(contractId).toScAddress(),
    key,
    durability: xdr.ContractDataDurability.persistent(),
  });
  return xdr.LedgerKey.contractData(data).toXDR("base64");
}

// Decodes the stored Consent { status, ledger }. Unit enum variants arrive as ["Active"].
export function decodeConsentEntry(xdrB64) {
  const data = xdr.LedgerEntryData.fromXDR(xdrB64, "base64");
  const native = scValToNative(data.contractData().val());
  const status = Array.isArray(native.status) ? native.status[0] : native.status;
  return { status, ledger: Number(native.ledger) };
}

// Returns { status: "Active" | "Revoked", ledger } or null if the owner never registered.
export async function readConsent({ rpcUrl, contractId, owner, reference, fetchImpl = fetch }) {
  const res = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getLedgerEntries",
      params: { keys: [consentLedgerKeyXdr(contractId, owner, reference)] },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  const entry = (json.result?.entries || [])[0];
  return entry ? decodeConsentEntry(entry.xdr) : null;
}

// Gate used before delivering: has the owner revoked consent on chain?
//  - "ok":       deliver.
//  - "revoked":  the owner revoked, or a contract-address subscription has no active consent. Do not deliver.
// A failed read does NOT block delivery (the RPC being down must not silence alerts), but it is logged.
// Reads are cached for `ttlMs` so a burst of events does not hit the RPC once per event.
export function makeConsentGate(cfg, { read = readConsent, fetchImpl = fetch, ttlMs = 15_000, now = Date.now, log = () => {} } = {}) {
  const cache = new Map();
  return async function gate(sub) {
    if (!sub.consent_ref || !cfg.consentContractId) return "ok";
    const k = `${sub.address}:${sub.consent_ref}`;
    let hit = cache.get(k);
    if (!hit || now() - hit.at > ttlMs) {
      try {
        const c = await read({ rpcUrl: cfg.notifyRpcUrl, contractId: cfg.consentContractId, owner: sub.address, reference: sub.consent_ref, fetchImpl });
        hit = { at: now(), c };
        cache.set(k, hit);
      } catch (err) {
        log(`consent read failed for ${sub.address.slice(0, 6)}…: ${err.message}`);
        return "ok";
      }
    }
    if (hit.c?.status === "Revoked") return "revoked";
    if (!hit.c && sub.ownership_proof === "onchain-consent") return "revoked";
    return "ok";
  };
}
