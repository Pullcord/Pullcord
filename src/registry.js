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
  {
    id: "usdc-asset-contract",
    protocol: "Circle USDC",
    role: "stellar-asset-contract",
    contractId: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
    source: "issuer GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN from https://developers.circle.com/stablecoins/usdc-contract-addresses; contract id computed with `stellar contract id asset --network mainnet` (matches the 402 challenge contract)",
    fields: [{ key: "Admin", type: "address" }],
  },
  // Operation of this admin contract by Circle: NO VERIFICADO. Only its on-chain Owner is read.
  {
    id: "usdc-admin-contract",
    protocol: "Circle USDC",
    role: "admin-contract",
    contractId: "CCPLJV7AKKFIE4LXFVUWZXDI2HNLEC7U3CQHAMVDLYHQFGMGVTCR4D5W",
    source: "value of Admin in usdc-asset-contract instance storage (read via getLedgerEntries)",
    fields: [{ key: "Owner", type: "address" }],
  },
  {
    id: "eurc-asset-contract",
    protocol: "Circle EURC",
    role: "stellar-asset-contract",
    contractId: "CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV",
    source: "issuer GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2 from https://developers.circle.com/stablecoins/eurc-contract-addresses; contract id computed with `stellar contract id asset --network mainnet`",
    fields: [{ key: "Admin", type: "address" }],
  },
  // Operation of this admin contract by Circle: NO VERIFICADO. Only its on-chain Owner is read.
  {
    id: "eurc-admin-contract",
    protocol: "Circle EURC",
    role: "admin-contract",
    contractId: "CDCGJQS74ZKTL6TSP6JCXLEKOFO7RSA76QQCJD7PIIRZ2RLKPRZRHLRP",
    source: "value of Admin in eurc-asset-contract instance storage (read via getLedgerEntries)",
    fields: [{ key: "Owner", type: "address" }],
  },
];

export function findContract(id) {
  return REGISTRY.find((c) => c.id === id) || null;
}
