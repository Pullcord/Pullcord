// Proof that the subscriber controls a G address: the wallet signs a one-time
// challenge with SEP-53 (signMessage) and the server verifies it.
// SEP-53: ed25519 over SHA-256("Stellar Signed Message:\n" + message).
import { randomBytes } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";

export const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export function buildChallenge(address, network, now = Date.now()) {
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = now + CHALLENGE_TTL_MS;
  const message = [
    "Pullcord: subscribe this address to notifications.",
    "This signature does not move funds or authorize any transaction.",
    `Address: ${address}`,
    `Network: ${network}`,
    `Nonce: ${nonce}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
  ].join("\n");
  return { nonce, message, expiresAt };
}

// Wallets return the 64-byte signature as base64 or hex. Anything else is rejected.
export function decodeSignature(sig) {
  if (typeof sig !== "string") return null;
  const buf = /^[0-9a-f]{128}$/i.test(sig) ? Buffer.from(sig, "hex") : Buffer.from(sig, "base64");
  return buf.length === 64 ? buf : null;
}

export function verifyOwnership(address, message, signature) {
  const sig = decodeSignature(signature);
  if (!sig) return false;
  return Keypair.fromPublicKey(address).verifyMessage(message, sig);
}
