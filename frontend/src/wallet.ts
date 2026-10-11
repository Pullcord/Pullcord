// Freighter: conectar y firmar. Nunca se pide ni se toca una llave secreta.
import { isConnected, requestAccess, getNetworkDetails, signMessage } from "@stellar/freighter-api";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export async function detectFreighter(): Promise<boolean> {
  const r = await isConnected();
  return !r.error && r.isConnected;
}

export async function readNetwork() {
  const n = await getNetworkDetails();
  if (n.error) throw new Error(n.error.message || "No pude leer la red de Freighter.");
  return { network: n.network, isTestnet: n.networkPassphrase === TESTNET_PASSPHRASE };
}

export async function connect(): Promise<string> {
  const r = await requestAccess();
  if (r.error || !r.address) throw new Error(r.error?.message || "No diste acceso a Freighter.");
  return r.address;
}

const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};

/** Freighter devuelve la firma como Buffer (v3) o como string (v4+). La API acepta base64 o hex de 64 bytes. */
export function signatureToBase64(sm: unknown): string | null {
  if (typeof sm === "string") return sm;
  if (sm instanceof Uint8Array) return toBase64(sm);
  if (sm && typeof sm === "object" && Array.isArray((sm as { data?: unknown }).data)) {
    return toBase64(Uint8Array.from((sm as { data: number[] }).data));
  }
  return null;
}

export async function signChallenge(message: string, address: string): Promise<string> {
  const r = await signMessage(message, { address, networkPassphrase: TESTNET_PASSPHRASE });
  if (r.error) throw new Error(r.error.message || "Freighter rechazó la firma.");
  const sig = signatureToBase64(r.signedMessage);
  if (!sig) throw new Error("Freighter no devolvió una firma.");
  return sig;
}
