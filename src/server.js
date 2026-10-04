import express from "express";
import { loadConfig, paidRouteEnabled } from "./config.js";
import { REGISTRY, findContract } from "./registry.js";
import { buildReport } from "./read.js";
import { subscriptionRoutes } from "./notify/routes.js";
import { openStore } from "./notify/store.js";
import { startWatcher } from "./notify/watcher.js";
import { startTelegram, getBotUsername } from "./notify/telegram.js";

// Builds the HTTP app. `deps` lets tests inject fetch; production uses global fetch.
export async function createApp(config = loadConfig(), deps = {}) {
  const fetchImpl = deps.fetchImpl || fetch;
  const app = express();

  const readContract = async (req, res) => {
    const contract = findContract(req.params.id);
    if (!contract) return res.status(404).json({ error: "unknown contract id", ids: REGISTRY.map((c) => c.id) });
    try {
      res.json(await buildReport(contract, config, { fetchImpl }));
    } catch (err) {
      const status = err.code === "NOT_FOUND" ? 404 : 502;
      res.status(status).json({ error: err.message });
    }
  };

  // Health check for the host (fly.toml). No network calls.
  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  app.get("/v1/contracts", (_req, res) => {
    res.json({ contracts: REGISTRY.map((c) => ({ id: c.id, protocol: c.protocol, role: c.role, contractId: c.contractId, source: c.source })) });
  });

  // Free route.
  app.get("/v1/contracts/:id", readContract);

  // Notifications. Mounted only when a subscription store is provided.
  if (deps.store) {
    app.use("/v1/subscriptions", subscriptionRoutes(config, { store: deps.store, telegramUsername: deps.telegramUsername, resolve: deps.resolve }));
  }

  // Paid route (x402). Enabled only when the facilitator and pay-to wallet are configured.
  if (paidRouteEnabled(config)) {
    const { paymentMiddleware, x402ResourceServer } = await import("@x402/express");
    const { HTTPFacilitatorClient } = await import("@x402/core/server");
    const { ExactStellarScheme } = await import("@x402/stellar/exact/server");
    const facilitator = deps.facilitator || new HTTPFacilitatorClient({ url: config.facilitatorUrl });
    const resourceServer = new x402ResourceServer(facilitator).register(config.x402Network, new ExactStellarScheme());
    app.use(
      paymentMiddleware(
        {
          "GET /v1/paid/contracts/:id": {
            accepts: { scheme: "exact", price: config.price, network: config.x402Network, payTo: config.payTo },
          },
        },
        resourceServer,
      ),
    );
    app.get("/v1/paid/contracts/:id", readContract);
  } else {
    app.get("/v1/paid/contracts/:id", (_req, res) => res.status(503).json({ error: "paid route not configured" }));
  }

  return app;
}

// Entry point: node src/server.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const store = openStore(config.dbPath);
  const telegramUsername = config.telegramBotToken ? await getBotUsername(config.telegramBotToken) : null;
  const app = await createApp(config, { store, telegramUsername });
  app.listen(config.port, () =>
    console.log(
      `pullcord api on :${config.port} (paid route: ${paidRouteEnabled(config) ? "on" : "off"}, ` +
        `notify: ${config.notifyNetwork}, watcher: ${config.watcherEnabled ? "on" : "off"}, telegram: ${telegramUsername ? "@" + telegramUsername : "off"})`,
    ),
  );
  if (config.watcherEnabled) startWatcher(config, { store });
  if (telegramUsername) startTelegram(config, { store });
}
