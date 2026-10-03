// Synthetic fixtures only. Addresses come from fixed seeds; no mainnet data.
import { xdr, StrKey, Address, Keypair } from "@stellar/stellar-sdk";

export const contractIdFromSeed = (seed) => StrKey.encodeContract(Buffer.alloc(32, seed));
export const accountFromSeed = (seed) => Keypair.fromRawEd25519Seed(Buffer.alloc(32, seed)).publicKey();

const sym = (s) => xdr.ScVal.scvSymbol(s);
const u32 = (n) => xdr.ScVal.scvU32(n);
const addr = (a) => new Address(a).toScVal();
const vecKey = (...parts) => xdr.ScVal.scvVec(parts);
const map = (pairs) => xdr.ScVal.scvMap(pairs.map(([k, v]) => new xdr.ScMapEntry({ key: k, val: v })));

// Builds a base64 LedgerEntryData for a contract instance with the given storage.
export function instanceEntryB64({ contractId, wasmByte = 7, storage }) {
  const instance = new xdr.ScContractInstance({
    executable: xdr.ContractExecutable.contractExecutableWasm(Buffer.alloc(32, wasmByte)),
    storage: storage.map(([k, v]) => new xdr.ScMapEntry({ key: k, val: v })),
  });
  const entry = new xdr.ContractDataEntry({
    ext: xdr.ExtensionPoint.fromXDR(Buffer.from([0, 0, 0, 0])),
    contract: new Address(contractId).toScAddress(),
    key: xdr.ScVal.scvLedgerKeyContractInstance(),
    durability: xdr.ContractDataDurability.persistent(),
    val: xdr.ScVal.scvContractInstance(instance),
  });
  return xdr.LedgerEntryData.contractData(entry).toXDR("base64");
}

// Storage entries shaped like the DeFindex vault (synthetic values).
export function vaultStorage({ manager, emergency, upgradable = false, strategyPaused = true }) {
  return [
    [vecKey(sym("Manager")), addr(manager)],
    [vecKey(sym("EmergencyManager")), addr(emergency)],
    [sym("Upgradable"), xdr.ScVal.scvBool(upgradable)],
    [
      vecKey(sym("AssetStrategySet"), u32(0)),
      map([[sym("strategies"), xdr.ScVal.scvVec([map([[sym("address"), addr(contractIdFromSeed(90))], [sym("name"), xdr.ScVal.scvString("fixture strategy")], [sym("paused"), xdr.ScVal.scvBool(strategyPaused)]])])]]),
    ],
  ];
}

export const horizonAccount = ({ thresholds = [0, 0, 0], signers }) => ({
  thresholds: { low_threshold: thresholds[0], med_threshold: thresholds[1], high_threshold: thresholds[2] },
  signers,
});

// Fake fetch: answers the RPC getLedgerEntries call and Horizon account calls from a table.
export function fakeNetwork({ instances = {}, accounts = {}, latestLedger = 1000 }) {
  return async (url, init) => {
    const u = String(url);
    if (u.includes("/accounts/")) {
      const id = u.split("/accounts/")[1];
      if (!accounts[id]) return new Response("{}", { status: 404 });
      return new Response(JSON.stringify(accounts[id]), { status: 200, headers: { "content-type": "application/json" } });
    }
    const body = JSON.parse(init.body);
    const keyXdr = body.params.keys[0];
    const contractKey = Object.keys(instances).find((cid) => keyXdr === keyFor(cid));
    if (!contractKey) return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { entries: [], latestLedger } }), { status: 200 });
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: 1, result: { entries: [{ xdr: instances[contractKey], liveUntilLedgerSeq: 5000 }], latestLedger } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
}

// Mirrors src/rpc.js instanceLedgerKeyXdr for matching in the fake network.
import { instanceLedgerKeyXdr } from "../src/rpc.js";
export const keyFor = (cid) => instanceLedgerKeyXdr(cid);
