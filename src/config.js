// All endpoints and payment settings come from the environment. Nothing that
// varies by deployment is hardcoded (facilitator URL, pay-to wallet, network).

export function loadConfig(env = process.env) {
  return {
    rpcUrl: env.PULLCORD_RPC_URL || "https://mainnet.sorobanrpc.com",
    horizonUrl: env.PULLCORD_HORIZON_URL || "https://horizon.stellar.org",
    explorerBase: env.PULLCORD_EXPLORER_BASE || "https://stellar.expert/explorer/public",
    // x402 (paid route). Paid route stays disabled unless all three are set.
    x402Network: env.PULLCORD_X402_NETWORK || "stellar:testnet",
    facilitatorUrl: env.PULLCORD_FACILITATOR_URL || "",
    payTo: env.PULLCORD_PAY_TO || "",
    price: env.PULLCORD_PRICE || "$0.01",
    port: Number(env.PORT || 8080),
    // Notifications. Testnet by default: the bootcamp runs on testnet only.
    notifyRpcUrl: env.PULLCORD_NOTIFY_RPC_URL || "https://soroban-testnet.stellar.org",
    notifyNetwork: env.PULLCORD_NOTIFY_NETWORK || "testnet",
    notifyExplorerBase: env.PULLCORD_NOTIFY_EXPLORER_BASE || "https://stellar.expert/explorer/testnet",
    dbPath: env.PULLCORD_DB_PATH || "pullcord.db",
    telegramBotToken: env.PULLCORD_TELEGRAM_BOT_TOKEN || "",
    watcherEnabled: env.PULLCORD_WATCHER !== "off",
    pollIntervalMs: Number(env.PULLCORD_POLL_INTERVAL_MS || 5000),
    pageLimit: Number(env.PULLCORD_PAGE_LIMIT || 1000),
    maxPagesPerPoll: Number(env.PULLCORD_MAX_PAGES_PER_POLL || 20),
    // Local testing only: allows http:// and private hosts as webhook targets.
    allowHttpWebhooks: env.PULLCORD_ALLOW_HTTP_WEBHOOKS === "1",
  };
}

export function paidRouteEnabled(config) {
  return Boolean(config.facilitatorUrl && config.payTo);
}
