import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.js";
import { openStore } from "../src/notify/store.js";
import { sign } from "../packages/notify/signature.js";

const cfg = { rpcUrl: "https://rpc.test", horizonUrl: "https://horizon.test", explorerBase: "https://explorer.test", x402Network: "stellar:testnet", facilitatorUrl: "", payTo: "", price: "$0.01", port: 0 };

async function apiServer() {
  const store = openStore();
  const app = await createApp(cfg, { store });
  const { server, url } = await new Promise((ok) => {
    const s = app.listen(0, "127.0.0.1", () => ok({ server: s, url: `http://127.0.0.1:${s.address().port}` }));
  });
  return { store, server, url };
}

function signedPost(url, path, secret, bodyObj) {
  const body = JSON.stringify(bodyObj);
  return fetch(`${url}${path}`, { method: "POST", headers: { "Content-Type": "application/json", "Pullcord-Signature": sign(secret, body) }, body });
}

test("alerts: unregistered source is rejected even with a well-formed signature", async () => {
  const { server, url } = await apiServer();
  const r = await signedPost(url, "/v1/alerts/external", "any-secret", { source: "nirium-watch", type: "x402.timeout", message: "payment not settled" });
  assert.equal(r.status, 401);
  server.close();
});

test("alerts: registered source with a wrong signature is rejected", async () => {
  const { store, server, url } = await apiServer();
  store.createAlertSource("nirium-watch");
  const r = await signedPost(url, "/v1/alerts/external", "wrong-secret", { source: "nirium-watch", type: "x402.timeout", message: "payment not settled" });
  assert.equal(r.status, 401);
  server.close();
});

test("alerts: registered source with a valid signature is accepted and stored", async () => {
  const { store, server, url } = await apiServer();
  const { secret } = store.createAlertSource("nirium-watch");
  const r = await signedPost(url, "/v1/alerts/external", secret, {
    source: "nirium-watch",
    type: "x402.timeout",
    message: "payment not settled within the facilitator deadline",
    severity: "critical",
    data: { txHash: "ab".repeat(32) },
  });
  assert.equal(r.status, 201);
  const { id } = await r.json();
  assert.ok(id);

  const stored = store.listAlerts({ source: "nirium-watch" });
  assert.equal(stored.length, 1);
  assert.equal(stored[0].type, "x402.timeout");
  assert.equal(stored[0].severity, "critical");
  assert.deepEqual(stored[0].data, { txHash: "ab".repeat(32) });

  const list = await (await fetch(`${url}/v1/alerts/external?source=nirium-watch`)).json();
  assert.equal(list.alerts.length, 1);
  server.close();
});

test("alerts: a stale signature (outside the replay window) is rejected", async () => {
  const { store, server, url } = await apiServer();
  const { secret } = store.createAlertSource("nirium-watch");
  const bodyObj = { source: "nirium-watch", type: "x402.timeout", message: "late" };
  const body = JSON.stringify(bodyObj);
  const staleSig = sign(secret, body, Math.floor(Date.now() / 1000) - 3600);
  const r = await fetch(`${url}/v1/alerts/external`, { method: "POST", headers: { "Content-Type": "application/json", "Pullcord-Signature": staleSig }, body });
  assert.equal(r.status, 401);
  server.close();
});

test("alerts: validates shape (type, message, severity, data)", async () => {
  const { store, server, url } = await apiServer();
  const { secret } = store.createAlertSource("nirium-watch");
  const bad = { source: "nirium-watch", type: "x402.timeout", message: "x", severity: "nope" };
  const r = await signedPost(url, "/v1/alerts/external", secret, bad);
  assert.equal(r.status, 400);
  server.close();
});
