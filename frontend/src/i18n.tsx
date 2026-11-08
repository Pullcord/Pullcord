// Idioma del sitio (español / inglés). Español es el idioma original y el de
// arranque; la elección se guarda en localStorage con la misma clave que usa
// el pitch (/pitch), así los dos recuerdan lo mismo.
//
// Los componentes usan useLang().L("texto en español", "text in English").
// Los módulos que no son componentes (api, wallet, consent, util) arman sus
// mensajes en el momento en que se muestran, con tr(), que lee el idioma
// vigente.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

const KEY = "pullcord-lang";

function initial(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "es" || v === "en") return v;
  } catch {
    /* sin almacenamiento: queda español */
  }
  return "es";
}

let current: Lang = initial();

/** Texto según el idioma vigente, para código fuera de React. */
export const tr = (es: string, en: string) => (current === "en" ? en : es);

/** Locale para fechas y números según el idioma vigente. */
export const locale = () => (current === "en" ? "en-US" : "es-MX");

const META: Record<Lang, { title: string; description: string }> = {
  es: {
    title: "Pullcord: te avisa cuando llega un pago",
    description: "Pullcord te avisa cuando una dirección de Stellar recibe un pago. Solo avisa, nunca mueve fondos. Solo testnet.",
  },
  en: {
    title: "Pullcord: get notified when a payment arrives",
    description: "Pullcord notifies you when a Stellar address receives a payment. It only notifies, it never moves funds. Testnet only.",
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx>({ lang: current, setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>(current);

  const setLang = useCallback((l: Lang) => {
    current = l;
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* sin almacenamiento: el idioma solo dura esta visita */
    }
    setState(l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = META[lang].title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", META[lang].description);
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  return { lang, setLang, L, locale: lang === "en" ? "en-US" : "es-MX" };
}
