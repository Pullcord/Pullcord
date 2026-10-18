// Lee el registro de consentimiento DESPLEGADO en testnet con el mismo codigo que usa el backend.
// Uso: node scripts/check-consent-live.mjs [CONTRACT_ID] [OWNER] [REF_HEX ...]
import { readConsent } from "../src/notify/consent.js";
import { loadConfig } from "../src/config.js";

const cfg = loadConfig({});
const contractId = process.argv[2] || cfg.consentContractId;
const owner = process.argv[3] || "GCJX3HANXFTDBZENMAB3EEGY5J5U5PNJZZ23XQEKFTMAJJ5UUW72DKY7";
const refs = process.argv.slice(4);
if (refs.length === 0) {
  refs.push(
    "8866396cbcdfd02f5bbd551802547b350af389ac838c69512c5f7480cb7a1d06", // demo A: registrada y luego retirada
    "90b62c3528964bbdf51f8cc23fd98f5670881fb69afbd4f46521b5c5579110e6", // demo B: registrada y vigente
    "00".repeat(32), // nunca registrada
  );
}
for (const reference of refs) {
  const c = await readConsent({ rpcUrl: cfg.notifyRpcUrl, contractId, owner, reference });
  console.log(reference.slice(0, 12) + "…", "=>", c ? JSON.stringify(c) : "null (nunca registrada)");
}
