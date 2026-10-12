import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { LedSign } from "./LedSign";
import { useReducedMotion } from "../util";

const ROPE_BASE = 150; // largo de la cuerda en reposo
const PULL_AT = 60; // cuánto hay que jalar para que cuente

let ctx: AudioContext | null = null;
/** Ding corto con WebAudio. Solo suena si la persona lo activó. */
export function ding() {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1175, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 1);
  } catch {
    /* sin audio: no pasa nada */
  }
}

export function Hero({ sound, setSound }: { sound: boolean; setSound: (v: boolean) => void }) {
  const reduced = useReducedMotion();
  const [lit, setLit] = useState(false);
  const y = useMotionValue(0);
  const lineH = useTransform(y, (v) => ROPE_BASE + v);
  const dragged = useRef(false);

  const trigger = () => {
    setLit(true);
    if (sound) ding();
    setTimeout(() => {
      document.getElementById("suscribir")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }, reduced ? 0 : 700);
  };

  return (
    <section aria-labelledby="hero-title" className="relative flex min-h-[100svh] items-center overflow-hidden px-4 pb-16 pt-24">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-[1fr_auto]">
        <div className="pr-20 md:pr-0">
          <h1 id="hero-title" className="text-4xl font-bold sm:text-5xl lg:text-6xl">
            Jala la cuerda una vez.
            <br />
            <span className="text-signal-text">Te avisan cuando llegue un pago.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink2">
            Pullcord es una capa de avisos para apps de Stellar. Una app suma un paquete chico y tú recibes un mensaje cuando tu dirección recibe un
            pago.
          </p>
          <ul className="mt-6 space-y-2 text-base">
            {["Solo avisa, nunca mueve fondos", "Tú firmas el permiso con tu wallet", "Telegram o webhook firmado"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-signal" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-8" aria-live="polite">
            <LedSign lines={lit ? ["AVISO", "SOLICITADO"] : ["PARADA", "SOLICITADA"]} lit={lit} label={lit ? "Aviso solicitado" : "Parada solicitada, apagado"} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#suscribir" className="btn btn-primary">
              Ir a suscribirme
            </a>
            <button type="button" className="btn" aria-pressed={sound} onClick={() => setSound(!sound)}>
              {sound ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
              Sonido: {sound ? "activado" : "apagado"}
            </button>
          </div>
        </div>

        {/* Cuerda que cuelga del borde superior */}
        <div className="absolute right-6 top-0 md:static md:mr-16 md:self-stretch" style={{ width: 64 }}>
          <div className="relative mx-auto h-[330px] w-14 md:-mt-8">
            <motion.div
              aria-hidden
              className="absolute left-1/2 top-0 w-1.5 -translate-x-1/2 rounded-b"
              style={{ height: reduced ? ROPE_BASE : lineH, background: "repeating-linear-gradient(135deg, var(--text-2) 0 3px, var(--control) 3px 6px)" }}
            />
            <motion.button
              type="button"
              aria-label="Jalar la cuerda para pedir el aviso. Con teclado: Enter o Espacio"
              className="absolute left-1/2 grid h-14 w-14 -translate-x-1/2 cursor-grab place-items-center rounded-full border-4 border-signal active:cursor-grabbing"
              style={{ top: ROPE_BASE, y: reduced ? 0 : y, touchAction: "none", background: "var(--bg)" }}
              drag={reduced ? false : "y"}
              dragConstraints={{ top: 0, bottom: 130 }}
              dragElastic={0.25}
              dragSnapToOrigin
              dragTransition={{ bounceStiffness: 500, bounceDamping: 10 }}
              transition={{ type: "spring", stiffness: 260, damping: 9 }}
              onPointerDown={() => (dragged.current = false)}
              onDragStart={() => (dragged.current = true)}
              onDragEnd={(_, info) => info.offset.y > PULL_AT && trigger()}
              onClick={() => !dragged.current && trigger()}
            >
              <span className="h-3 w-3 rounded-full bg-signal" aria-hidden />
            </motion.button>
            <span className="absolute left-1/2 top-[230px] w-28 -translate-x-1/2 text-center text-xs text-ink2" aria-hidden>
              {reduced ? "Presiona" : "Jala hacia abajo"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
