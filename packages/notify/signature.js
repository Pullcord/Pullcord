// Webhook signature: `Pullcord-Signature: t=<unix seconds>,v1=<hex>` where
// v1 = HMAC-SHA256(secret, `${t}.${rawBody}`). The timestamp limits replays.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "pullcord-signature";

export function sign(secret, rawBody, t = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

// Returns true only for a valid, fresh signature. `headers` may be a plain
// object (Node/Express) or a Headers instance (fetch).
export function verify(headers, rawBody, secret, { toleranceSec = 300, now = Date.now() } = {}) {
  const header = typeof headers?.get === "function" ? headers.get(SIGNATURE_HEADER) : headers?.[SIGNATURE_HEADER];
  if (!header || !secret) return false;
  const parts = Object.fromEntries(String(header).split(",").map((p) => p.split("=", 2)));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = Buffer.from(sign(secret, String(rawBody), t).split("v1=")[1], "hex");
  const given = Buffer.from(parts.v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
