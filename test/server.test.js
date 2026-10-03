import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.js";
import { loadConfig, paidRouteEnabled } from "../src/config.js";

const base = { rpcUrl: "https://rpc.test", horizonUrl: "https://horizon.test", explorerBase: "https://explorer.test", x402Network: "stellar:testnet", facilitatorUrl: "", payTo: "", price: "$0.01", port: 0 };

async function serve(app) {
  return new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
}

test("config: paid route is off unless facilitator and pay-to are both set", () => {
  assert.equal(paidRouteEnabled(loadConfig({})), false);
  assert.equal(paidRouteEnabled(loadConfig({ PULLCORD_FACILITATOR_URL: "https://f.test" })), false);
  assert.equal(paidRouteEnabled(loadConfig({ PULLCORD_FACILITATOR_URL: "https://f.test", PULLCORD_PAY_TO: "GAAA" })), true);
});

test("free route lists registry and rejects unknown ids", async () => {
  const app = await createApp(base, {});
  const s = await serve(app);
  const port = s.address().port;
  const list = await (await fetch(`http://127.0.0.1:${port}/v1/contracts`)).json();
  assert.ok(list.contracts.length >= 3);
  const bad = await fetch(`http://127.0.0.1:${port}/v1/contracts/nope`);
  assert.equal(bad.status, 404);
  s.close();
});

test("paid route answers 503 when x402 is not configured", async () => {
  const app = await createApp(base, {});
  const s = await serve(app);
  const r = await fetch(`http://127.0.0.1:${s.address().port}/v1/paid/contracts/x`);
  assert.equal(r.status, 503);
  s.close();
});
