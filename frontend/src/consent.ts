// Registro de consentimiento en cadena (contracts/consent-registry, testnet).
// La wallet del dueño firma `register` o `revoke` con Freighter: nunca se pide ni
// se toca una llave secreta, y en la cadena no va ningún dato personal, solo un hash.
import { rpc, Contract, TransactionBuilder, Address, nativeToScVal, BASE_FEE } from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { TESTNET_PASSPHRASE } from "./wallet";
import { tr } from "./i18n";

const RPC_URL = "https://soroban-testnet.stellar.org";

export type ConsentInfo = { contractId: string; network: string; explorer: string | null; reference: string };
export type ConsentResult = { hash: string; explorer: string };

const hexToBytes = (hex: string) => {
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error(tr("La referencia de consentimiento no es válida.", "The consent reference isn't valid."));
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

/** Convierte los errores del contrato (#1, #2, #3) y de la wallet en un mensaje claro. */
function friendly(err: unknown): Error {
  const m = err instanceof Error ? err.message : String(err);
  if (/Error\(Contract, #1\)/.test(m)) return new Error(tr("Ya diste tu consentimiento para esta suscripción.", "You already gave consent for this subscription."));
  if (/Error\(Contract, #2\)/.test(m)) return new Error(tr("Todavía no hay un consentimiento registrado para retirar.", "There's no registered consent to revoke yet."));
  if (/Error\(Contract, #3\)/.test(m)) return new Error(tr("Ese consentimiento ya estaba retirado.", "That consent was already revoked."));
  if (/account not found|not found/i.test(m)) return new Error(tr("Tu cuenta no existe en testnet todavía. Fondéala con Friendbot.", "Your account doesn't exist on testnet yet. Fund it with Friendbot."));
  if (/User declined|rejected|denied/i.test(m)) return new Error(tr("Cancelaste la firma en Freighter.", "You cancelled the signature in Freighter."));
  return new Error(m);
}

async function invoke(method: "register" | "revoke", owner: string, info: ConsentInfo): Promise<ConsentResult> {
  try {
    const server = new rpc.Server(RPC_URL);
    const account = await server.getAccount(owner);
    const op = new Contract(info.contractId).call(
      method,
      new Address(owner).toScVal(),
      nativeToScVal(hexToBytes(info.reference), { type: "bytes" }),
    );
    const built = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: TESTNET_PASSPHRASE })
      .addOperation(op)
      .setTimeout(60)
      .build();
    const prepared = await server.prepareTransaction(built); // simula y calcula el recurso/fee; falla aquí si el contrato rechaza
    const signed = await signTransaction(prepared.toXDR(), { networkPassphrase: TESTNET_PASSPHRASE, address: owner });
    if (signed.error) throw new Error(signed.error.message || tr("Freighter rechazó la firma.", "Freighter rejected the signature."));
    const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signed.signedTxXdr, TESTNET_PASSPHRASE));
    if (sent.status === "ERROR") throw new Error(tr("La red rechazó la transacción.", "The network rejected the transaction."));
    for (let i = 0; i < 30; i++) {
      const r = await server.getTransaction(sent.hash);
      if (r.status === "SUCCESS") return { hash: sent.hash, explorer: `https://stellar.expert/explorer/testnet/tx/${sent.hash}` };
      if (r.status === "FAILED") throw new Error(tr("La transacción falló en la red.", "The transaction failed on the network."));
      await new Promise((ok) => setTimeout(ok, 1000));
    }
    throw new Error(tr("La transacción tarda en confirmarse. Revisa el explorador con este hash: ", "The transaction is taking a while to confirm. Check the explorer with this hash: ") + sent.hash);
  } catch (e) {
    throw friendly(e);
  }
}

/** El dueño da su consentimiento: queda registrado en la cadena y se puede retirar cuando quiera. */
export const registerConsent = (owner: string, info: ConsentInfo) => invoke("register", owner, info);
/** El dueño retira su consentimiento. Pullcord deja de avisar y borra los datos guardados. */
export const revokeConsent = (owner: string, info: ConsentInfo) => invoke("revoke", owner, info);
