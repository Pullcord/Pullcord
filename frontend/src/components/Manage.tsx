import { useState, type FormEvent } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { ApiError, deleteSubscription, getSubscription, type Subscription } from "../api";
import { shortAddr } from "../util";

type Err = { message: string; original?: string };
const asErr = (e: unknown): Err => (e instanceof ApiError ? { message: e.friendly, original: e.message } : { message: "Algo salió mal." });

export function Manage() {
  const [id, setId] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [error, setError] = useState<Err | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const view = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDeleted(false);
    setConfirming(false);
    try {
      setSub(await getSubscription(id.trim(), token.trim()));
    } catch (err) {
      setSub(null);
      setError(asErr(err));
    } finally {
      setBusy(false);
    }
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
      setError(asErr(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="man-title" className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 id="man-title" className="text-3xl font-bold">Gestiona una suscripción</h2>
        <p className="mt-2 text-ink2">Con el ID y el manageToken que te dimos puedes ver el estado o darte de baja.</p>
        <form onSubmit={view} className="card mt-6 space-y-4 p-5 sm:p-8">
          <div>
            <label htmlFor="m-id" className="font-medium">ID de la suscripción</label>
            <input id="m-id" className="field mono mt-1" value={id} onChange={(e) => setId(e.target.value)} autoComplete="off" required />
          </div>
          <div>
            <label htmlFor="m-token" className="font-medium">manageToken</label>
            <input id="m-token" className="field mono mt-1" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !id || !token}>
            {busy && <Loader2 className="animate-spin" size={18} aria-hidden />} Ver estado
          </button>

          <div aria-live="polite" className="space-y-3">
            {error && (
              <div role="alert" className="rounded-xl border border-err p-3 text-sm">
                <p className="font-medium text-err">{error.message}</p>
                {error.original && <p className="mono mt-1 text-xs text-ink2">Original: {error.original}</p>}
              </div>
            )}
            {deleted && <p className="font-medium text-ok">Listo: la suscripción se borró.</p>}
            {sub && (
              <dl className="grid gap-2 rounded-xl bg-elevated p-4 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-ink2">Dirección</dt>
                <dd className="mono">{shortAddr(sub.address)}</dd>
                <dt className="text-ink2">Canal</dt>
                <dd>{sub.channel}</dd>
                <dt className="text-ink2">Eventos</dt>
                <dd>{sub.events.join(", ")}</dd>
                <dt className="text-ink2">Vinculado</dt>
                <dd>{sub.linked ? "Sí" : "Todavía no"}</dd>
                <dt className="text-ink2">Prueba de propiedad</dt>
                <dd>{sub.ownershipProof}</dd>
                {sub.appLabel && (
                  <>
                    <dt className="text-ink2">App</dt>
                    <dd>{sub.appLabel}</dd>
                  </>
                )}
              </dl>
            )}
          </div>

          {sub && (
            <div className="rounded-xl border border-line p-4">
              <p className="flex gap-2 text-sm">
                <AlertTriangle size={18} className="shrink-0 text-signal-text" aria-hidden />
                Darte de baja borra la suscripción, la URL del webhook o tu chat ID de Telegram, y el registro de entregas. No se puede deshacer.
              </p>
              {!confirming ? (
                <button type="button" className="btn mt-3" onClick={() => setConfirming(true)}>
                  Darme de baja
                </button>
              ) : (
                <div className="mt-3 flex flex-wrap gap-3" role="group" aria-label="Confirmar baja">
                  <button type="button" className="btn" style={{ borderColor: "var(--err)", color: "var(--err)" }} onClick={remove} disabled={busy}>
                    Sí, borrar todo
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirming(false)}>
                    Cancelar
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
