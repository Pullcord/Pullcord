// Cliente de la API de Pullcord. Mismo origen: el proxy de Vite (o Express) reenvía /v1.
export class ApiError extends Error {
  status: number;
  constructor(status: number, original: string) {
    super(original);
    this.status = status;
  }
  /** Mensaje claro en español. El original (en inglés) se muestra aparte, en letra pequeña. */
  get friendly(): string {
    const m = this.message;
    if (this.status === 0) return "No hay conexión con la API de Pullcord.";
    if (/telegram channel not configured/i.test(m)) return "Este servidor no tiene Telegram activado. Elige Webhook.";
    if (/webhook must use https/i.test(m)) return "El webhook debe usar https.";
    if (/webhook host is not allowed/i.test(m)) return "Ese servidor no está permitido como webhook (no puede ser una red privada).";
    if (/does not resolve/i.test(m)) return "No se pudo resolver el dominio del webhook.";
    if (/webhook must be a URL/i.test(m)) return "Eso no parece una URL.";
    if (/credentials/i.test(m)) return "La URL del webhook no puede llevar usuario ni contraseña.";
    if (/appLabel/i.test(m)) return "El nombre de la app es inválido: máximo 40 caracteres ASCII, sin datos personales.";
    if (/challenge unknown, used or expired/i.test(m)) return "El reto ya se usó o venció. Pide uno nuevo.";
    if (/signature does not match/i.test(m)) return "La firma no corresponde a esta dirección.";
    if (/ownership proof required/i.test(m)) return "Falta la prueba de que la dirección es tuya.";
    if (/valid G address/i.test(m)) return "Esa no es una dirección G válida.";
    if (/not found/i.test(m)) return "No existe, o el token no corresponde.";
    if (this.status === 429) return "Demasiadas solicitudes. Espera un momento.";
    if (this.status >= 500) return "La API tuvo un problema. Intenta de nuevo.";
    return "La API rechazó la solicitud.";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError(0, "network error");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, typeof body?.error === "string" ? body.error : `HTTP ${res.status}`);
  return body as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export type ConsentRef = { contractId: string; network: string; explorer: string | null; reference: string };
export type Challenge = { nonce: string; message: string; expiresAt: string; standard: "SEP-53"; consent?: ConsentRef };
export type Channel = { webhook: string } | { telegram: true };
export type Subscription = {
  id: string;
  address: string;
  events: string[];
  channel: string;
  linked: boolean;
  ownershipProof: string;
  appLabel: string | null;
  createdAt: string | number;
  /** Solo si la suscripción tiene referencia de consentimiento en cadena. status: null = nunca se registró. */
  consent?: ConsentRef & { status: "Active" | "Revoked" | null };
};
export type Created = Subscription & { secret?: string; telegramLink?: string; manageToken: string; note: string };
export type Stats = { appsIntegrated: number; subscriptions: number; notificationsSent: number };

export const getChallenge = (address: string) => request<Challenge>("/v1/subscriptions/challenge", json({ address }));

export const createSubscription = (b: {
  address: string;
  channel: Channel;
  nonce: string;
  signature: string;
  appLabel?: string;
}) =>
  request<Created>(
    "/v1/subscriptions",
    json({
      address: b.address,
      events: ["payment.received"],
      channel: b.channel,
      proof: { nonce: b.nonce, signature: b.signature },
      ...(b.appLabel ? { appLabel: b.appLabel } : {}),
    }),
  );

export const getSubscription = (id: string, token: string) =>
  request<Subscription>(`/v1/subscriptions/${encodeURIComponent(id)}`, { headers: bearer(token) });

export const deleteSubscription = (id: string, token: string) =>
  request<void>(`/v1/subscriptions/${encodeURIComponent(id)}`, { method: "DELETE", headers: bearer(token) });

export const getStats = () => request<Stats>("/v1/subscriptions/stats");

/** Alerta que mandó una fuente externa registrada (otra app). Sin datos personales. */
export type ExternalAlert = {
  id: string;
  source: string;
  type: string;
  message: string;
  severity: "info" | "warning" | "critical";
  data: Record<string, unknown> | null;
  received_at: string;
};

export const getExternalAlerts = (limit = 20) =>
  request<{ alerts: ExternalAlert[] }>(`/v1/alerts/external?limit=${limit}`).then((b) => b.alerts);
