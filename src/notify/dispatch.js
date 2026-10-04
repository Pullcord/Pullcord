// Delivers one notification to one subscription. Only notifies: nothing here
// signs or submits a transaction.
import { sign, SIGNATURE_HEADER } from "../../packages/notify/signature.js";
import { formatAmount, assetCode } from "./events.js";
import { safePost } from "./ssrf.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (a) => (a && a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

export function paymentPayload(sub, t, cfg) {
  return {
    id: `${t.id}:${sub.id}`,
    type: "payment.received",
    subscriptionId: sub.id,
    network: cfg.notifyNetwork,
    address: sub.address,
    payment: {
      from: t.from,
      to: t.to,
      toMuxedId: t.toMuxedId,
      asset: t.asset,
      amount: t.amount,
      amountDecimal: formatAmount(t),
      tokenContract: t.contractId,
    },
    ledger: t.ledger,
    ledgerClosedAt: t.ledgerClosedAt,
    txHash: t.txHash,
    source: { kind: "rpc-getEvents", eventId: t.id, explorer: `${cfg.notifyExplorerBase}/tx/${t.txHash}` },
  };
}

export function telegramText(payload) {
  const p = payload.payment;
  const amount = p.amountDecimal ? `${p.amountDecimal} ${assetCode(p.asset)}` : `${p.amount} (unidades del token ${short(p.tokenContract)})`;
  return [
    `Pago recibido en ${short(payload.address)}`,
    `${amount} de ${short(p.from)}`,
    `Red: ${payload.network} · ledger ${payload.ledger}`,
    payload.source.explorer,
  ].join("\n");
}

// Delivery goes through safePost: DNS is checked at connect time and
// redirects are not followed (see ssrf.js).
export async function postWebhook(url, secret, payload, { attempts = 3, baseDelayMs = 1000, timeoutMs = 10_000, allowPrivate = false, resolve } = {}) {
  const body = JSON.stringify(payload);
  let lastError = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await safePost(url, {
        headers: { "Content-Type": "application/json", [SIGNATURE_HEADER]: sign(secret, body), "User-Agent": "pullcord-notify" },
        body,
        timeoutMs,
        allowPrivate,
        resolve,
      });
      if (res.status >= 200 && res.status < 300) return { ok: true, attempts: i };
      if (res.status >= 300 && res.status < 400) return { ok: false, attempts: i, error: `redirect not followed (HTTP ${res.status})` };
      lastError = `HTTP ${res.status}`;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break; // receiver rejected it; retrying will not help
    } catch (err) {
      lastError = err.message;
      if (err.code === "EBLOCKEDHOST") return { ok: false, attempts: i, error: err.message }; // blocked hosts are never retried
    }
    if (i < attempts) await sleep(baseDelayMs * 2 ** (i - 1));
  }
  return { ok: false, attempts, error: lastError };
}

export async function sendTelegram(botToken, chatId, text, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const json = await res.json().catch(() => ({}));
  return json.ok ? { ok: true, attempts: 1 } : { ok: false, attempts: 1, error: json.description || `HTTP ${res.status}` };
}

export async function deliver(sub, transfer, cfg, { store, fetchImpl = fetch, retryDelayMs } = {}) {
  if (!store.claimDelivery(transfer.id, sub.id)) return { skipped: true };
  const payload = paymentPayload(sub, transfer, cfg);
  const result =
    sub.channel === "webhook"
      ? await postWebhook(sub.webhook_url, sub.webhook_secret, payload, { baseDelayMs: retryDelayMs, allowPrivate: cfg.allowHttpWebhooks })
      : await sendTelegram(cfg.telegramBotToken, sub.telegram_chat_id, telegramText(payload), { fetchImpl });
  store.finishDelivery(transfer.id, sub.id, result.ok ? "sent" : "failed", result.attempts);
  return result;
}
