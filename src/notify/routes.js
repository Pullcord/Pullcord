// Subscription API. Secrets (webhook HMAC secret, manage token) are returned
// once at creation; only a hash of the manage token is stored.
//
// Ownership: a G address needs a SEP-53 signature over a one-time challenge
// (POST /challenge, then POST / with { proof: { nonce, signature } }).
// A C address cannot sign SEP-53 messages; until the on-chain consent registry
// exists, C subscriptions are accepted on testnet only and marked unverified.
import express from "express";
import { StrKey } from "@stellar/stellar-sdk";
import { assertPublicHost } from "./ssrf.js";
import { buildChallenge, verifyOwnership } from "./ownership.js";

export const SUPPORTED_EVENTS = ["payment.received"];

const isG = (a) => typeof a === "string" && StrKey.isValidEd25519PublicKey(a);
const isC = (a) => typeof a === "string" && StrKey.isValidContract(a);

// Returns a problem string, or null if the URL may be stored. DNS is resolved
// here for fast feedback and again at every delivery (ssrf.js).
export async function checkWebhookUrl(raw, { allowHttp = false, resolve } = {}) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return "webhook must be a URL";
  }
  if (u.protocol !== "https:" && !(allowHttp && u.protocol === "http:")) return "webhook must use https";
  if (u.username || u.password) return "webhook must not contain credentials";
  if (allowHttp) return null; // local testing only
  try {
    await assertPublicHost(u.hostname, { resolve });
  } catch (err) {
    return err.code === "EBLOCKEDHOST" ? "webhook host is not allowed" : `webhook host does not resolve (${err.code || err.message})`;
  }
  return null;
}

export function subscriptionRoutes(cfg, { store, telegramUsername = null, resolve }) {
  const r = express.Router();
  r.use(express.json({ limit: "16kb" }));

  const bearer = (req) => (req.get("authorization") || "").replace(/^Bearer\s+/i, "") || null;
  const view = (s) => ({
    id: s.id,
    address: s.address,
    events: s.events,
    channel: s.channel,
    linked: s.channel === "webhook" || Boolean(s.telegram_chat_id),
    ownershipProof: s.ownership_proof,
    createdAt: s.created_at,
  });

  // Step 1: the app asks for a challenge and has the user's wallet sign `message` (SEP-53).
  r.post("/challenge", (req, res) => {
    const { address } = req.body || {};
    if (isC(address)) return res.status(400).json({ error: "contract addresses cannot sign SEP-53 messages; no challenge needed on testnet" });
    if (!isG(address)) return res.status(400).json({ error: "address must be a valid G address" });
    const c = buildChallenge(address, cfg.notifyNetwork);
    store.saveChallenge({ nonce: c.nonce, address, message: c.message, expiresAt: c.expiresAt });
    res.status(201).json({ nonce: c.nonce, message: c.message, expiresAt: new Date(c.expiresAt).toISOString(), standard: "SEP-53" });
  });

  // Step 2: subscribe with the signed challenge.
  r.post("/", async (req, res) => {
    const { address, contract, events = SUPPORTED_EVENTS, channel = {}, proof } = req.body || {};
    if (contract) return res.status(501).json({ error: "contract subscriptions are not supported yet" });
    if (!isG(address) && !isC(address)) return res.status(400).json({ error: "address must be a valid G or C address" });
    if (!Array.isArray(events) || events.length === 0 || !events.every((e) => SUPPORTED_EVENTS.includes(e))) {
      return res.status(400).json({ error: "unsupported events", supported: SUPPORTED_EVENTS });
    }

    let ownershipProof;
    if (isG(address)) {
      if (!proof?.nonce || !proof?.signature) {
        return res.status(401).json({ error: "ownership proof required: POST /v1/subscriptions/challenge, sign the message with the wallet (SEP-53), send { proof: { nonce, signature } }" });
      }
      const challenge = store.takeChallenge(proof.nonce, address);
      if (!challenge) return res.status(401).json({ error: "challenge unknown, used or expired" });
      if (!verifyOwnership(address, challenge.message, proof.signature)) return res.status(401).json({ error: "signature does not match the address" });
      ownershipProof = "sep53";
    } else {
      if (cfg.notifyNetwork !== "testnet") return res.status(403).json({ error: "contract address subscriptions need on-chain consent, not available on this network yet" });
      ownershipProof = "none";
    }

    const base = { address, events, ownershipProof };
    let created;
    if (channel.webhook) {
      const problem = await checkWebhookUrl(channel.webhook, { allowHttp: cfg.allowHttpWebhooks, resolve });
      if (problem) return res.status(400).json({ error: problem });
      created = store.create({ ...base, channel: "webhook", webhookUrl: channel.webhook });
    } else if (channel.telegram) {
      if (!telegramUsername) return res.status(503).json({ error: "telegram channel not configured" });
      created = store.create({ ...base, channel: "telegram" });
    } else {
      return res.status(400).json({ error: "channel must be { webhook: url } or { telegram: true }" });
    }

    res.status(201).json({
      ...view(created),
      ...(ownershipProof === "none" ? { warning: "testnet only: contract address ownership is not verified" } : {}),
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
