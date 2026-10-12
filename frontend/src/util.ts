import { useEffect, useState } from "react";

export const shortAddr = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

const REDUCED = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  const [r, setR] = useState(() => window.matchMedia(REDUCED).matches);
  useEffect(() => {
    const m = window.matchMedia(REDUCED);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadTxt(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Valida un webhook en vivo: solo https y sin credenciales. */
export function webhookProblem(v: string): string | null {
  if (!v) return null;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return "Eso no parece una URL. Ejemplo: https://webhook.site/tu-id";
  }
  if (u.protocol !== "https:") return "Debe empezar con https://";
  if (u.username || u.password) return "No puede llevar usuario ni contraseña.";
  return null;
}
