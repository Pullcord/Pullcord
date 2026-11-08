import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { connect, readNetwork } from "../wallet";
import { registerConsent, revokeConsent, type ConsentInfo, type ConsentResult } from "../consent";
import { tr, useLang } from "../i18n";

/**
 * Consentimiento en cadena. `mode="register"` lo da; `mode="revoke"` lo retira.
 * Siempre lo firma el dueño de la dirección con Freighter. No mueve fondos.
 */
export function ConsentPanel({
  address,
  info,
  mode,
  onSuccess,
}: {
  address: string;
  info: ConsentInfo;
  mode: "register" | "revoke";
  onSuccess?: () => void;
}) {
  const { L } = useLang();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConsentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const register = mode === "register";

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const net = await readNetwork();
      if (!net.isTestnet) throw new Error(tr("Freighter debe estar en Testnet.", "Freighter must be on Testnet."));
      const who = await connect();
      if (who !== address)
        throw new Error(
          tr(
            "Esa no es la wallet de la suscripción. Cambia de cuenta en Freighter.",
            "That isn't the subscription's wallet. Switch accounts in Freighter.",
          ),
        );
      const r = await (register ? registerConsent : revokeConsent)(address, info);
      setResult(r);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("No pude completar la firma.", "Couldn't complete the signature."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-line p-4" aria-live="polite">
      <h4 className="flex items-center gap-2 font-display text-lg font-bold">
        <ShieldCheck size={20} className="text-signal-text" aria-hidden />
        {register
          ? L("Consentimiento en la cadena (opcional)", "On-chain consent (optional)")
          : L("Retirar el consentimiento en la cadena", "Revoke the on-chain consent")}
      </h4>
      <p className="mt-1 text-sm text-ink2">
        {register
          ? L(
              "Deja un registro público y verificable de que tú autorizaste esta suscripción. No incluye tu webhook, tu chat ni ningún dato personal: solo un hash. Puedes retirarlo cuando quieras.",
              "Leaves a public, verifiable record that you authorized this subscription. It doesn't include your webhook, your chat or any personal data: only a hash. You can revoke it whenever you want.",
            )
          : L(
              "Al retirarlo, Pullcord deja de avisarte y borra la URL del webhook o tu chat de Telegram. Queda el registro público de que lo retiraste.",
              "When you revoke it, Pullcord stops notifying you and deletes the webhook URL or your Telegram chat. The public record that you revoked it stays.",
            )}{" "}
        {L("La firma no mueve fondos.", "Signing doesn't move funds.")}
      </p>
      {info.explorer && (
        <p className="mt-1 text-sm">
          <a className="text-signal-text underline" href={info.explorer} target="_blank" rel="noreferrer">
            {L("Ver el contrato en el explorador", "View the contract in the explorer")} <ExternalLink size={14} className="inline" aria-hidden />
          </a>
        </p>
      )}
      {!result ? (
        <button type="button" className="btn mt-3" onClick={run} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : null}
          {busy
            ? L("Esperando a Freighter…", "Waiting for Freighter…")
            : register
              ? L("Registrar mi consentimiento", "Register my consent")
              : L("Retirar mi consentimiento", "Revoke my consent")}
        </button>
      ) : (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-ok">
          <CheckCircle2 size={18} aria-hidden /> {register ? L("Consentimiento registrado.", "Consent registered.") : L("Consentimiento retirado.", "Consent revoked.")}
          <a className="text-signal-text underline" href={result.explorer} target="_blank" rel="noreferrer">
            {L("Ver la transacción", "View the transaction")} <ExternalLink size={14} className="inline" aria-hidden />
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
