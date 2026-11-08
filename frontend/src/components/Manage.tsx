import { useState, type FormEvent } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { ApiError, deleteSubscription, getSubscription, type Subscription } from "../api";
import { shortAddr } from "../util";
import { ConsentPanel } from "./ConsentPanel";
import { tr, useLang } from "../i18n";

// Se guarda el error, no el texto: así el mensaje sigue el idioma si se cambia después.
type Err = { error: unknown };
const describe = ({ error }: Err): { message: string; original?: string } =>
  error instanceof ApiError ? { message: error.friendly, original: error.message } : { message: tr("Algo salió mal.", "Something went wrong.") };

export function Manage() {
  const { L } = useLang();
  const [id, setId] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [error, setError] = useState<Err | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const refresh = async () => {
    setBusy(true);
    setError(null);
    try {
      setSub(await getSubscription(id.trim(), token.trim()));
    } catch (err) {
      setSub(null);
      setError({ error: err });
    } finally {
      setBusy(false);
    }
  };

  const view = async (e: FormEvent) => {
    e.preventDefault();
    setDeleted(false);
    setConfirming(false);
    await refresh();
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteSubscription(id.trim(), token.trim());
      setSub(null);
      setDeleted(true);
      setConfirming(false);
      setToken("");
    } catch (err) {
      setError({ error: err });
    } finally {
      setBusy(false);
    }
  };

  const shown = error ? describe(error) : null;
  const consentLabel = (s: Subscription["consent"]) =>
    s?.status === "Active" ? L("Vigente", "Active") : s?.status === "Revoked" ? L("Retirado", "Revoked") : L("Sin registrar", "Not registered");

  return (
    <section aria-labelledby="man-title" className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 id="man-title" className="text-3xl font-bold">{L("Gestiona una suscripción", "Manage a subscription")}</h2>
        <p className="mt-2 text-ink2">
          {L(
            "Con el ID y el manageToken que te dimos puedes ver el estado o darte de baja.",
            "With the ID and manageToken we gave you, you can check the status or unsubscribe.",
          )}
        </p>
        <form onSubmit={view} className="card mt-6 space-y-4 p-5 sm:p-8">
          <div>
            <label htmlFor="m-id" className="font-medium">{L("ID de la suscripción", "Subscription ID")}</label>
            <input id="m-id" className="field mono mt-1" value={id} onChange={(e) => setId(e.target.value)} autoComplete="off" required />
          </div>
          <div>
            <label htmlFor="m-token" className="font-medium">manageToken</label>
            <input id="m-token" className="field mono mt-1" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !id || !token}>
            {busy && <Loader2 className="animate-spin" size={18} aria-hidden />} {L("Ver estado", "Check status")}
          </button>

          <div aria-live="polite" className="space-y-3">
            {shown && (
              <div role="alert" className="rounded-xl border border-err p-3 text-sm">
                <p className="font-medium text-err">{shown.message}</p>
                {shown.original && <p className="mono mt-1 text-xs text-ink2">Original: {shown.original}</p>}
              </div>
            )}
            {deleted && <p className="font-medium text-ok">{L("Listo: la suscripción se borró.", "Done: the subscription was deleted.")}</p>}
            {sub && (
              <dl className="grid gap-2 rounded-xl bg-elevated p-4 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-ink2">{L("Dirección", "Address")}</dt>
                <dd className="mono">{shortAddr(sub.address)}</dd>
                <dt className="text-ink2">{L("Canal", "Channel")}</dt>
                <dd>{sub.channel}</dd>
                <dt className="text-ink2">{L("Eventos", "Events")}</dt>
                <dd>{sub.events.join(", ")}</dd>
                <dt className="text-ink2">{L("Vinculado", "Linked")}</dt>
                <dd>{sub.linked ? L("Sí", "Yes") : L("Todavía no", "Not yet")}</dd>
                <dt className="text-ink2">{L("Prueba de propiedad", "Ownership proof")}</dt>
                <dd>{sub.ownershipProof}</dd>
                {sub.appLabel && (
                  <>
                    <dt className="text-ink2">App</dt>
                    <dd>{sub.appLabel}</dd>
                  </>
                )}
                {sub.consent && (
                  <>
                    <dt className="text-ink2">{L("Consentimiento en cadena", "On-chain consent")}</dt>
                    <dd>{consentLabel(sub.consent)}</dd>
                  </>
                )}
              </dl>
            )}
            {sub?.consent?.status === "Active" && <ConsentPanel address={sub.address} info={sub.consent} mode="revoke" onSuccess={refresh} />}
          </div>

          {sub && (
            <div className="rounded-xl border border-line p-4">
              <p className="flex gap-2 text-sm">
                <AlertTriangle size={18} className="shrink-0 text-signal-text" aria-hidden />
                {L(
                  "Darte de baja borra la suscripción, la URL del webhook o tu chat ID de Telegram, y el registro de entregas. No se puede deshacer.",
                  "Unsubscribing deletes the subscription, the webhook URL or your Telegram chat ID, and the delivery log. It can't be undone.",
                )}
              </p>
              {!confirming ? (
                <button type="button" className="btn mt-3" onClick={() => setConfirming(true)}>
                  {L("Darme de baja", "Unsubscribe")}
                </button>
              ) : (
                <div className="mt-3 flex flex-wrap gap-3" role="group" aria-label={L("Confirmar baja", "Confirm unsubscribe")}>
                  <button type="button" className="btn" style={{ borderColor: "var(--err)", color: "var(--err)" }} onClick={remove} disabled={busy}>
                    {L("Sí, borrar todo", "Yes, delete everything")}
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirming(false)}>
                    {L("Cancelar", "Cancel")}
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
