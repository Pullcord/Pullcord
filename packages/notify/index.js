// Client for the Pullcord notification API. No dependencies: uses global fetch.
import { verify, sign, SIGNATURE_HEADER } from "./signature.js";

export { verify, sign, SIGNATURE_HEADER };

// Accepts what wallets return: bytes, a base64/hex string, or an object with
// `signedMessage` (wallet APIs that wrap the result).
function encodeSignature(sig) {
  if (sig && typeof sig === "object" && "signedMessage" in sig) sig = sig.signedMessage;
  if (sig instanceof Uint8Array) return btoa(String.fromCharCode(...sig)); // works in browsers and Node
  if (typeof sig === "string") return sig;
  throw new Error("Pullcord: signMessage must return the signature as bytes or a base64/hex string");
}

export class Pullcord {
  constructor({ url = globalThis.process?.env?.PULLCORD_URL, fetchImpl = globalThis.fetch } = {}) {
    if (!url) throw new Error("Pullcord: pass { url } or set PULLCORD_URL");
    this.url = url.replace(/\/$/, "");
    this.fetch = fetchImpl;
  }

  async #request(method, path, { body, token } = {}) {
    const res = await this.fetch(`${this.url}${path}`, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(`Pullcord: ${json.error || res.status}`), { status: res.status, body: json });
    return json;
  }

  // channel: { webhook: "https://..." } or { telegram: true }.
  // signMessage: (message) => signature. Required for G addresses: the user's
  // wallet signs a one-time challenge (SEP-53) to prove it owns the address.
  // Returns { id, secret?, telegramLink?, manageToken }. Secrets are shown once: store them.
  async subscribe({ address, contract, events = ["payment.received"], channel, signMessage }) {
    let proof;
    if (typeof address === "string" && address.startsWith("G")) {
      if (typeof signMessage !== "function") throw new Error("Pullcord: signMessage is required for G addresses (SEP-53)");
      const challenge = await this.#request("POST", "/v1/subscriptions/challenge", { body: { address } });
      proof = { nonce: challenge.nonce, signature: encodeSignature(await signMessage(challenge.message)) };
    }
    return this.#request("POST", "/v1/subscriptions", { body: { address, contract, events, channel, proof } });
  }

  get(id, manageToken) {
    return this.#request("GET", `/v1/subscriptions/${encodeURIComponent(id)}`, { token: manageToken });
  }

  // Deletes the subscription and the personal data stored with it.
  unsubscribe(id, manageToken) {
    return this.#request("DELETE", `/v1/subscriptions/${encodeURIComponent(id)}`, { token: manageToken });
  }

  static verify = verify;
}
