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
  };
}

export function paidRouteEnabled(config) {
  return Boolean(config.facilitatorUrl && config.payTo);
}
