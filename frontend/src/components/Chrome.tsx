import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Logo } from "./Logo";

function currentTheme(): "light" | "dark" {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function ThemeToggle() {
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
    <button type="button" className="btn" onClick={flip} aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
      {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}

export function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 px-4 py-3">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <a href="#top" aria-label="pullcord, inicio">
          <Logo />
        </a>
        <ThemeToggle />
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
  return (
    <footer className="border-t border-line px-4 pb-20 pt-8 text-sm text-ink2">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <a className="underline" href="https://github.com/Pullcord/Pullcord" target="_blank" rel="noreferrer">
          github.com/Pullcord/Pullcord
        </a>
        <span>Licencia Apache-2.0</span>
        <span>Solo testnet</span>
      </div>
    </footer>
  );
}
