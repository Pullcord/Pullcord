// Arma la MISMA invocacion que frontend/src/consent.ts y la SIMULA contra el contrato desplegado
// en testnet (no la envia, no firma, no gasta nada). Sirve para comprobar que los argumentos
// (Address + bytes de 32) los acepta el contrato, sin abrir un navegador ni Freighter.
import { rpc, Contract, TransactionBuilder, Address, nativeToScVal, BASE_FEE, Networks } from "@stellar/stellar-sdk";
import { randomBytes } from "node:crypto";

const RPC = "https://soroban-testnet.stellar.org";
const CID = process.argv[2] || "CBAU7N2YV5PHA6LJHFUJKW6J5GFEJAGMYBQFOOEYVJJSQBWV6R7VZJAA";
const OWNER = process.argv[3] || "GCJX3HANXFTDBZENMAB3EEGY5J5U5PNJZZ23XQEKFTMAJJ5UUW72DKY7";
const server = new rpc.Server(RPC);
const hex = (h) => Uint8Array.from(Buffer.from(h, "hex"));

async function sim(method, refHex) {
  const account = await server.getAccount(OWNER);
  const op = new Contract(CID).call(method, new Address(OWNER).toScVal(), nativeToScVal(hex(refHex), { type: "bytes" }));
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET }).addOperation(op).setTimeout(60).build();
  const r = await server.simulateTransaction(tx);
  return rpc.Api.isSimulationError(r) ? `ERROR ${r.error.slice(0, 140)}` : "OK (la simulacion pasa)";
}

const fresh = randomBytes(32).toString("hex");
console.log("register  referencia nueva        =>", await sim("register", fresh));
console.log("register  B (ya vigente)          =>", await sim("register", "90b62c3528964bbdf51f8cc23fd98f5670881fb69afbd4f46521b5c5579110e6"));
console.log("revoke    B (vigente)             =>", await sim("revoke", "90b62c3528964bbdf51f8cc23fd98f5670881fb69afbd4f46521b5c5579110e6"));
console.log("revoke    A (ya retirada)         =>", await sim("revoke", "8866396cbcdfd02f5bbd551802547b350af389ac838c69512c5f7480cb7a1d06"));
console.log("revoke    nunca registrada        =>", await sim("revoke", fresh));
