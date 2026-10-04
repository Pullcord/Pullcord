// Reads CAP-67 `transfer` events from Stellar RPC getEvents. Since Protocol 23,
// classic payments between G accounts emit these too, so one source covers G
// and C addresses and every asset. Read-only: never sends a transaction.
import { xdr, scValToNative, nativeToScVal } from "@stellar/stellar-sdk";

const TRANSFER = nativeToScVal("transfer", { type: "symbol" }).toXDR("base64");
// ["transfer", from, to, ...]: SAC events carry a 4th topic (the asset); plain
// SEP-41 tokens carry 3. "**" matches both.
export const TRANSFER_FILTER = { type: "contract", topics: [[TRANSFER, "*", "*", "**"]] };

async function rpcCall(rpcUrl, method, params, fetchImpl) {
  const res = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(20_000), // a hung request would stall the watcher loop
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) {
    const err = new Error(`RPC error: ${json.error.message}`);
    err.rpcCode = json.error.code;
    throw err;
  }
  return json.result;
}

export async function getLatestLedger(rpcUrl, { fetchImpl = fetch } = {}) {
  return (await rpcCall(rpcUrl, "getLatestLedger", {}, fetchImpl)).sequence;
}

// One page of transfer events. Pass either startLedger (first run) or cursor.
export async function getTransferPage(rpcUrl, { startLedger, cursor, limit = 1000, fetchImpl = fetch }) {
  const params = { filters: [TRANSFER_FILTER], pagination: cursor ? { cursor, limit } : { limit } };
  if (!cursor) params.startLedger = startLedger;
  const result = await rpcCall(rpcUrl, "getEvents", params, fetchImpl);
  return {
    events: (result.events || []).map(decodeTransfer).filter(Boolean),
    rawCount: (result.events || []).length,
    cursor: result.cursor,
    latestLedger: result.latestLedger,
  };
}

const native = (b64) => scValToNative(xdr.ScVal.fromXDR(b64, "base64"));

// Normalizes one RPC event into a transfer, or null if it is not one.
export function decodeTransfer(e) {
  if (e.inSuccessfulContractCall === false) return null;
  let topics;
  try {
    topics = e.topic.map(native);
  } catch {
    return null;
  }
  if (topics[0] !== "transfer" || topics.length < 3) return null;
  const value = native(e.value);
  // CAP-67: data is the amount, or { amount, to_muxed_id } when the destination is muxed.
  const amount = typeof value === "object" && value !== null && "amount" in value ? value.amount : value;
  const toMuxedId = typeof value === "object" && value !== null && "to_muxed_id" in value ? String(value.to_muxed_id) : null;
  return {
    id: e.id,
    ledger: e.ledger,
    ledgerClosedAt: e.ledgerClosedAt ?? null,
    txHash: e.txHash,
    contractId: e.contractId,
    from: String(topics[1]),
    to: String(topics[2]),
    asset: topics[3] !== undefined ? String(topics[3]) : null,
    amount: String(amount),
    toMuxedId,
  };
}

// SAC amounts always have 7 decimals. Other tokens: decimals unknown, keep raw.
export function formatAmount(transfer) {
  if (!transfer.asset) return null;
  const raw = BigInt(transfer.amount);
  const neg = raw < 0n;
  const abs = neg ? -raw : raw;
  const whole = abs / 10_000_000n;
  const frac = (abs % 10_000_000n).toString().padStart(7, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

export const assetCode = (asset) => (asset === "native" ? "XLM" : asset ? asset.split(":")[0] : null);
