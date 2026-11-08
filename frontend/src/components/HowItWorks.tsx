import { useLang } from "../i18n";

type Step = { n: number; who: [string, string]; text: [string, string]; here: boolean };

const STEPS: Step[] = [
  {
    n: 1,
    who: ["La app", "The app"],
    text: ["Integra el paquete @pullcord/notify y llama a subscribe() con tu dirección.", "Adds the @pullcord/notify package and calls subscribe() with your address."],
    here: false,
  },
  {
    n: 2,
    who: ["Tú", "You"],
    text: ["Firmas con tu wallet un reto de un solo uso (SEP-53). No mueve fondos.", "Sign a single-use challenge (SEP-53) with your wallet. It doesn't move funds."],
    here: true,
  },
  {
    n: 3,
    who: ["Pullcord", "Pullcord"],
    text: [
      "Verifica la firma, crea la suscripción y te da un enlace de Telegram si lo elegiste.",
      "Checks the signature, creates the subscription and gives you a Telegram link if you chose it.",
    ],
    here: true,
  },
  {
    n: 4,
    who: ["Tú", "You"],
    text: ["Abres el enlace de Telegram, o dejas tu webhook listo.", "Open the Telegram link, or get your webhook ready."],
    here: true,
  },
  {
    n: 5,
    who: ["Cualquiera", "Anyone"],
    text: ["Envía un pago a tu dirección en la red de Stellar (testnet).", "Sends a payment to your address on the Stellar network (testnet)."],
    here: false,
  },
  {
    n: 6,
    who: ["Pullcord", "Pullcord"],
    text: ["Detecta el evento transfer con getEvents y lo cruza con las suscripciones.", "Picks up the transfer event with getEvents and matches it against subscriptions."],
    here: false,
  },
  {
    n: 7,
    who: ["Pullcord", "Pullcord"],
    text: ["Entrega el aviso firmado por webhook o lo manda por Telegram.", "Delivers the signed alert to your webhook or sends it on Telegram."],
    here: false,
  },
  {
    n: 8,
    who: ["Tú", "You"],
    text: ["Ves el aviso con el monto, el origen y el enlace a la transacción.", "See the alert with the amount, the sender and a link to the transaction."],
    here: false,
  },
];

export function HowItWorks() {
  const { L } = useLang();
  return (
    <section aria-labelledby="how-title" className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 id="how-title" className="text-3xl font-bold">{L("Cómo funciona", "How it works")}</h2>
        <p className="mt-2 text-ink2">
          {L(
            "Ocho pasos. Los marcados con ámbar pasan en esta página. El resto pasa en otro lado.",
            "Eight steps. The ones marked in amber happen on this page. The rest happen somewhere else.",
          )}
        </p>
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
                  {L(...s.who)} ·{" "}
                  <span className={s.here ? "font-semibold text-signal-text" : ""}>
                    {s.here ? L("En esta página", "On this page") : L("Fuera de esta página", "Outside this page")}
                  </span>
                </p>
                <p>{L(...s.text)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
