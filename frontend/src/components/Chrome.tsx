import { useState } from "react";
import { Languages, Moon, Sun } from "lucide-react";
import { Logo } from "./Logo";
import { useLang } from "../i18n";

function currentTheme(): "light" | "dark" {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function ThemeToggle() {
  const { L } = useLang();
  const [theme, setTheme] = useState(currentTheme);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("pullcord-theme", next);
    } catch {
      /* sin almacenamiento: el tema solo dura esta visita */
    }
    setTheme(next);
  };
  return (
    <button
      type="button"
      className="btn"
      onClick={flip}
      aria-label={theme === "dark" ? L("Cambiar a modo claro", "Switch to light mode") : L("Cambiar a modo oscuro", "Switch to dark mode")}
    >
      {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}

/** Muestra el idioma al que cambia: "EN" estando en español, "ES" estando en inglés. */
function LangToggle() {
  const { lang, setLang } = useLang();
  const toEnglish = lang === "es";
  return (
    <button
      type="button"
      className="btn"
      onClick={() => setLang(toEnglish ? "en" : "es")}
      aria-label={toEnglish ? "Cambiar el sitio a inglés" : "Switch the site to Spanish"}
      lang={toEnglish ? "en" : "es"}
    >
      <Languages size={18} aria-hidden />
      <span className="font-bold">{toEnglish ? "EN" : "ES"}</span>
    </button>
  );
}

export function Header() {
  const { L } = useLang();
  return (
    <header className="absolute inset-x-0 top-0 z-20 px-4 py-3">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <nav aria-label={L("Principal", "Main")} className="flex items-center gap-5">
          <a href="#top" aria-label={L("pullcord, inicio", "pullcord, home")}>
            <Logo />
          </a>
          <a href="#alertas" className="inline-flex min-h-11 items-center font-semibold text-ink2 underline-offset-4 hover:text-ink hover:underline">
            {L("Alertas", "Alerts")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function TestnetBadge() {
  return (
    <div
      className="fixed bottom-3 left-3 z-50 rounded-full border-2 px-3 py-1 text-xs font-bold tracking-widest"
      style={{ background: "var(--bg)", borderColor: "var(--signal-text)", color: "var(--signal-text)" }}
      role="note"
    >
      TESTNET
    </div>
  );
}

export function Footer() {
  const { L } = useLang();
  return (
    <footer className="border-t border-line px-4 pb-20 pt-8 text-sm text-ink2">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <a className="underline" href="https://github.com/Pullcord/Pullcord" target="_blank" rel="noreferrer">
          github.com/Pullcord/Pullcord
        </a>
        <span>{L("Licencia Apache-2.0", "Apache-2.0 license")}</span>
        <span>{L("Solo testnet", "Testnet only")}</span>
      </div>
    </footer>
  );
}
