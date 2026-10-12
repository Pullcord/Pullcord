import { useEffect, useState } from "react";

/** Visible solo cuando /healthz no responde: build publicado sin la API detrás. */
export function DemoNotice() {
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/healthz")
      .then((res) => {
        if (!cancelled && !res.ok) setApiDown(true);
      })
      .catch(() => {
        if (!cancelled) setApiDown(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!apiDown) return null;
  return (
    <div
      role="note"
      className="px-4 py-2 text-center text-sm font-medium"
      style={{ background: "var(--elevated)", color: "var(--info)", borderTop: "1px solid var(--border)" }}
    >
      Vista de demostración: la API no está publicada todavía. Para probar el flujo completo, corre el proyecto en
      local (ver README).
    </div>
  );
}
