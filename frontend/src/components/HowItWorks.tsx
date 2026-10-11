const STEPS: { n: number; who: string; text: string; here: boolean }[] = [
  { n: 1, who: "La app", text: "Integra el paquete @pullcord/notify y llama a subscribe() con tu dirección.", here: false },
  { n: 2, who: "Tú", text: "Firmas con tu wallet un reto de un solo uso (SEP-53). No mueve fondos.", here: true },
  { n: 3, who: "Pullcord", text: "Verifica la firma, crea la suscripción y te da un enlace de Telegram si lo elegiste.", here: true },
  { n: 4, who: "Tú", text: "Abres el enlace de Telegram, o dejas tu webhook listo.", here: true },
  { n: 5, who: "Cualquiera", text: "Envía un pago a tu dirección en la red de Stellar (testnet).", here: false },
  { n: 6, who: "Pullcord", text: "Detecta el evento transfer con getEvents y lo cruza con las suscripciones.", here: false },
  { n: 7, who: "Pullcord", text: "Entrega el aviso firmado por webhook o lo manda por Telegram.", here: false },
  { n: 8, who: "Tú", text: "Ves el aviso con el monto, el origen y el enlace a la transacción.", here: false },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 id="how-title" className="text-3xl font-bold">Cómo funciona</h2>
        <p className="mt-2 text-ink2">Ocho pasos. Los marcados con ámbar pasan en esta página. El resto pasa en otro lado.</p>
        <ol className="mt-8 space-y-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card flex gap-4 p-4" style={s.here ? { borderColor: "var(--signal-text)" } : undefined}>
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-display font-bold"
                style={s.here ? { background: "var(--signal)", color: "var(--on-signal)" } : { border: "1px solid var(--control)" }}
              >
                {s.n}
              </span>
              <div>
                <p className="text-sm text-ink2">
                  {s.who} · <span className={s.here ? "font-semibold text-signal-text" : ""}>{s.here ? "En esta página" : "Fuera de esta página"}</span>
                </p>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
