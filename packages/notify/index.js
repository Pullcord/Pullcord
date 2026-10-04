// Client for the Pullcord notification API. No dependencies: uses global fetch.
import { verify, sign, SIGNATURE_HEADER } from "./signature.js";

export { verify, sign, SIGNATURE_HEADER };

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
  // Returns { id, secret?, telegramLink?, manageToken }. Secrets are shown once: store them.
  subscribe({ address, contract, events = ["payment.received"], channel }) {
    return this.#request("POST", "/v1/subscriptions", { body: { address, contract, events, channel } });
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
