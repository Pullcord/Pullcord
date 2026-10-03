// Contracts the engine reads. Addresses come from each project's own published
// sources (see `source` on every entry). Adding a contract means adding an
// entry here with its source, and never a number without one.

export const REGISTRY = [
  {
    id: "defindex-factory",
    protocol: "DeFindex",
    role: "factory",
    contractId: "CDKFHFJIET3A73A2YN4KV7NSV32S6YGQMUFH3DNJXLBWL4SKEGVRNFKI",
    source: "defindex-io/stellar-contracts public/mainnet.contracts.json @ be878a9",
    // storage key -> how to report it
    fields: [
      { key: "Admin", type: "address" },
    ],
  },
  {
    id: "defindex-vault-usdc",
    protocol: "DeFindex",
    role: "vault",
    contractId: "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK",
    source: "defindex-io/defindex-skill endpoints.md @ 9f8f7806be (example vault)",
    fields: [
      { key: "Manager", type: "address" },
      { key: "EmergencyManager", type: "address" },
      { key: "RebalanceManager", type: "address" },
      { key: "VaultFeeReceiver", type: "address" },
      { key: "DeFindexProtocolFeeReceiver", type: "address" },
      { key: "Upgradable", type: "bool" },
      { key: "AssetStrategySet", type: "strategies" },
    ],
  },
  {
    id: "soroswap-factory",
    protocol: "Soroswap",
    role: "factory",
    contractId: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2",
    source: "soroswap/core README.md and docs deployed-addresses.mdx",
    fields: [
      { key: "FeeToSetter", type: "address" },
      { key: "FeeTo", type: "address" },
    ],
  },
];

export function findContract(id) {
  return REGISTRY.find((c) => c.id === id) || null;
}
