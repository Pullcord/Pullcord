// Subscription API. Secrets (webhook HMAC secret, manage token) are returned
// once at creation; only a hash of the manage token is stored.
import express from "express";
import { isIP } from "node:net";
import { StrKey } from "@stellar/stellar-sdk";

export const SUPPORTED_EVENTS = ["payment.received"];

const isAddress = (a) => typeof a === "string" && (StrKey.isValidEd25519PublicKey(a) || StrKey.isValidContract(a));

// Blocks obvious internal targets. Does not resolve DNS, so a public name that
// points to a private IP is not caught (known gap, see README).
function privateIp(host) {
  const h = host.replace(/^\[|\]$/g, "");
  if (isIP(h) === 4) {
    const [a, b] = h.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (isIP(h) === 6) return h === "::1" || h === "::" || /^f[cd]/i.test(h) || /^fe80/i.test(h) || /^::ffff:/i.test(h);
  return false;
}

export function checkWebhookUrl(raw, { allowHttp = false } = {}) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return "webhook must be a URL";
  }
  if (u.protocol !== "https:" && !(allowHttp && u.protocol === "http:")) return "webhook must use https";
  const host = u.hostname.toLowerCase();
  if (!allowHttp && (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local") || privateIp(host))) {
    return "webhook host is not allowed";
  }
  return null;
}

export function subscriptionRoutes(cfg, { store, telegramUsername = null }) {
  const r = express.Router();
  r.use(express.json({ limit: "16kb" }));

  const bearer = (req) => (req.get("authorization") || "").replace(/^Bearer\s+/i, "") || null;
  const view = (s) => ({ id: s.id, address: s.address, events: s.events, channel: s.channel, linked: s.channel === "webhook" || Boolean(s.telegram_chat_id), createdAt: s.created_at });

  r.post("/", (req, res) => {
    const { address, contract, events = SUPPORTED_EVENTS, channel = {} } = req.body || {};
    if (contract) return res.status(501).json({ error: "contract subscriptions are not supported yet" });
    if (!isAddress(address)) return res.status(400).json({ error: "address must be a valid G or C address" });
    if (!Array.isArray(events) || events.length === 0 || !events.every((e) => SUPPORTED_EVENTS.includes(e))) {
      return res.status(400).json({ error: "unsupported events", supported: SUPPORTED_EVENTS });
    }

    let created;
    if (channel.webhook) {
      const problem = checkWebhookUrl(channel.webhook, { allowHttp: cfg.allowHttpWebhooks });
      if (problem) return res.status(400).json({ error: problem });
      created = store.create({ address, events, channel: "webhook", webhookUrl: channel.webhook });
    } else if (channel.telegram) {
      if (!telegramUsername) return res.status(503).json({ error: "telegram channel not configured" });
      created = store.create({ address, events, channel: "telegram" });
    } else {
      return res.status(400).json({ error: "channel must be { webhook: url } or { telegram: true }" });
    }

    res.status(201).json({
      ...view(created),
      secret: created.webhookSecret ?? undefined,
      telegramLink: created.telegramLinkToken ? `https://t.me/${telegramUsername}?start=${created.telegramLinkToken}` : undefined,
      manageToken: created.manageToken,
      note: "secret and manageToken are shown only once",
    });
  });

  r.get("/:id", (req, res) => {
    const sub = store.authorize(req.params.id, bearer(req));
    if (!sub) return res.status(404).json({ error: "not found" });
    res.json(view(sub));
  });

  // Deletes the subscription and its personal data (webhook URL, chat ID).
  r.delete("/:id", (req, res) => {
    const sub = store.authorize(req.params.id, bearer(req));
    if (!sub) return res.status(404).json({ error: "not found" });
    store.delete(sub.id);
    res.status(204).end();
  });

  return r;
}
