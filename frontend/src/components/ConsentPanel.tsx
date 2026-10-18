import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { connect, readNetwork } from "../wallet";
import { registerConsent, revokeConsent, type ConsentInfo, type ConsentResult } from "../consent";

/**
 * Consentimiento en cadena. `mode="register"` lo da; `mode="revoke"` lo retira.
 * Siempre lo firma el dueño de la dirección con Freighter. No mueve fondos.
 */
export function ConsentPanel({ address, info, mode }: { address: string; info: ConsentInfo; mode: "register" | "revoke" }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConsentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const register = mode === "register";

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const net = await readNetwork();
      if (!net.isTestnet) throw new Error("Freighter debe estar en Testnet.");
      const who = await connect();
      if (who !== address) throw new Error("Esa no es la wallet de la suscripción. Cambia de cuenta en Freighter.");
      setResult(await (register ? registerConsent : revokeConsent)(address, info));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pude completar la firma.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-line p-4" aria-live="polite">
      <h4 className="flex items-center gap-2 font-display text-lg font-bold">
        <ShieldCheck size={20} className="text-signal-text" aria-hidden />
        {register ? "Consentimiento en la cadena (opcional)" : "Retirar el consentimiento en la cadena"}
      </h4>
      <p className="mt-1 text-sm text-ink2">
        {register
          ? "Deja un registro público y verificable de que tú autorizaste esta suscripción. No incluye tu webhook, tu chat ni ningún dato personal: solo un hash. Puedes retirarlo cuando quieras."
          : "Al retirarlo, Pullcord deja de avisarte y borra la URL del webhook o tu chat de Telegram. Queda el registro público de que lo retiraste."}{" "}
        La firma no mueve fondos.
      </p>
      {info.explorer && (
        <p className="mt-1 text-sm">
          <a className="text-signal-text underline" href={info.explorer} target="_blank" rel="noreferrer">
            Ver el contrato en el explorador <ExternalLink size={14} className="inline" aria-hidden />
          </a>
        </p>
      )}
      {!result ? (
        <button type="button" className="btn mt-3" onClick={run} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : null}
          {busy ? "Esperando a Freighter…" : register ? "Registrar mi consentimiento" : "Retirar mi consentimiento"}
        </button>
      ) : (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-ok">
          <CheckCircle2 size={18} aria-hidden /> {register ? "Consentimiento registrado." : "Consentimiento retirado."}
          <a className="text-signal-text underline" href={result.explorer} target="_blank" rel="noreferrer">
            Ver la transacción <ExternalLink size={14} className="inline" aria-hidden />
          </a>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-err">
          {error}
        </p>
      )}
    </div>
  );
}
