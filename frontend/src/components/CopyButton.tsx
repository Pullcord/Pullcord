import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "../util";
import { useLang } from "../i18n";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const { L } = useLang();
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  return (
    <button
      type="button"
      className="btn"
      aria-label={`${L("Copiar", "Copy")} ${label}`}
      onClick={async () => {
        setState((await copyText(text)) ? "ok" : "fail");
        setTimeout(() => setState("idle"), 1800);
      }}
    >
      {state === "ok" ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
      <span aria-live="polite">{state === "ok" ? L("Copiado", "Copied") : state === "fail" ? L("No se pudo", "Couldn't copy") : L("Copiar", "Copy")}</span>
    </button>
  );
}
