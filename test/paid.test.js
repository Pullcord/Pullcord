import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/server.js";
import { accountFromSeed } from "./helpers.js";

// Local stub facilitator: answers /supported only. No settlement happens here.
function stubFacilitator() {
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith("/supported")) {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({
        kinds: [{ x402Version: 2, scheme: "exact", network: "stellar:testnet", extra: { areFeesSponsored: true } }],
        extensions: [],
        signers: { "stellar:*": [accountFromSeed(50)] },
      }));
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) => srv.listen(0, "127.0.0.1", () => resolve(srv)));
}

test("paid route without a payment returns 402 with payment requirements", async () => {
  const fac = await stubFacilitator();
  const facUrl = `http://127.0.0.1:${fac.address().port}`;
  const cfg = { rpcUrl: "https://rpc.test", horizonUrl: "https://horizon.test", explorerBase: "https://explorer.test", x402Network: "stellar:testnet", facilitatorUrl: facUrl, payTo: accountFromSeed(51), price: "$0.01", port: 0 };
  const app = await createApp(cfg, {});
  const srv = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  const r = await fetch(`http://127.0.0.1:${srv.address().port}/v1/paid/contracts/fixture`);
  assert.equal(r.status, 402);
  assert.ok(r.headers.get("payment-required"), "payment-required header present");
  srv.close(); fac.close();
});
