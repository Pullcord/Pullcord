import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "../util";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  return (
    <button
      type="button"
      className="btn"
      aria-label={`Copiar ${label}`}
      onClick={async () => {
        setState((await copyText(text)) ? "ok" : "fail");
        setTimeout(() => setState("idle"), 1800);
      }}
    >
      {state === "ok" ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
      <span aria-live="polite">{state === "ok" ? "Copiado" : state === "fail" ? "No se pudo" : "Copiar"}</span>
    </button>
  );
}
