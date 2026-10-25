// Inbound alerts from a registered external source (e.g. another app's own
// monitor). Signed the same way Pullcord signs its own outgoing webhooks:
// header Pullcord-Signature: t=<unix>,v1=HMAC-SHA256(secret, `${t}.${rawBody}`).
// Sources are registered out of band (scripts/register-alert-source.mjs),
// never through this API: there is no self-registration.
import express from "express";
import { verify as verifySignature } from "../../packages/notify/signature.js";

export const SEVERITIES = ["info", "warning", "critical"];

export function alertRoutes({ store }) {
  const r = express.Router();
  r.use(
    express.json({
      limit: "16kb",
      verify: (req, _res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
    }),
  );

  r.post("/external", (req, res) => {
    const { source, type, message, severity = "info", data } = req.body || {};
    if (typeof source !== "string" || !source) return res.status(400).json({ error: "source is required" });

    const row = store.getAlertSource(source);
    // Same response whether the source is unknown or the signature is wrong:
    // this is an allowlist, not a secret worth distinguishing failure modes for.
    if (!row || !verifySignature(req.headers, req.rawBody ?? "", row.secret)) {
      return res.status(401).json({ error: "unknown source or invalid signature" });
    }

    if (typeof type !== "string" || !type) return res.status(400).json({ error: "type is required" });
    if (typeof message !== "string" || !message) return res.status(400).json({ error: "message is required" });
    if (!SEVERITIES.includes(severity)) return res.status(400).json({ error: `severity must be one of ${SEVERITIES.join(", ")}` });
    if (data !== undefined && data !== null && (typeof data !== "object" || Array.isArray(data))) {
      return res.status(400).json({ error: "data must be an object" });
    }

    const saved = store.saveAlert({ source, type, message, severity, data: data ?? null });
    res.status(201).json({ id: saved.id, receivedAt: saved.receivedAt });
  });

  // Operator/demo view: no personal data here (sources are apps, not people).
  r.get("/external", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json({ alerts: store.listAlerts({ limit, source: req.query.source || null }) });
  });

  return r;
}
