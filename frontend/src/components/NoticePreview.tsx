import { shortAddr } from "../util";

// Formato exacto de src/notify/dispatch.js (paymentPayload y telegramText).
// Los datos son de ejemplo: no son un pago real.
const addr = (tag: string) => "G" + tag.padEnd(55, "A");
const EXAMPLE = {
  subscriptionId: "sub_ejemplo",
  address: addr("EJEMPLO"),
  from: addr("REMITENTE"),
  txHash: "e".repeat(64),
  eventId: "0000000000000000-0000000001",
  ledger: 1234567,
  ledgerClosedAt: "2026-10-11T18:00:00Z",
  amount: "100000000",
  amountDecimal: "10",
  asset: "native",
  tokenContract: "C" + "EJEMPLO".padEnd(55, "A"),
  network: "testnet",
  explorerBase: "https://stellar.expert/explorer/testnet",
};

const payload = {
  id: `${EXAMPLE.eventId}:${EXAMPLE.subscriptionId}`,
  type: "payment.received",
  subscriptionId: EXAMPLE.subscriptionId,
  network: EXAMPLE.network,
  address: EXAMPLE.address,
  payment: {
    from: EXAMPLE.from,
    to: EXAMPLE.address,
    asset: EXAMPLE.asset,
    amount: EXAMPLE.amount,
    amountDecimal: EXAMPLE.amountDecimal,
    tokenContract: EXAMPLE.tokenContract,
  },
  ledger: EXAMPLE.ledger,
  ledgerClosedAt: EXAMPLE.ledgerClosedAt,
  txHash: EXAMPLE.txHash,
  source: { kind: "rpc-getEvents", eventId: EXAMPLE.eventId, explorer: `${EXAMPLE.explorerBase}/tx/${EXAMPLE.txHash}` },
};

// Misma plantilla que telegramText() del servidor.
const telegram = [
  `Pago recibido en ${shortAddr(payload.address)}`,
  `${payload.payment.amountDecimal} XLM de ${shortAddr(payload.payment.from)}`,
  `Red: ${payload.network} · ledger ${payload.ledger}`,
  payload.source.explorer,
].join("\n");

export function NoticePreview() {
  return (
    <section aria-labelledby="prev-title" className="px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 id="prev-title" className="text-3xl font-bold">Así se ve el aviso</h2>
        <p className="mt-2 text-ink2">El mismo formato que manda el servidor. Los datos son de ejemplo, no es un pago real.</p>
        <div className="mt-8 grid items-start gap-8 md:grid-cols-[320px_1fr]">
          <figure className="mx-auto w-full max-w-[320px]">
            <div className="rounded-[2.2rem] border-4 border-control bg-bg p-3">
              <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-line" aria-hidden />
              <p className="px-1 text-xs text-ink2">Pullcord bot · ejemplo</p>
              <div className="mt-2 rounded-2xl rounded-tl-sm bg-elevated p-3">
                <p className="mono whitespace-pre-wrap text-sm">{telegram}</p>
              </div>
              <div className="h-8" aria-hidden />
            </div>
            <figcaption className="mt-2 text-center text-sm text-ink2">Telegram (ejemplo)</figcaption>
          </figure>
          <figure className="min-w-0">
            <p className="mono mb-2 text-sm text-ink2">Cabecera: pullcord-signature: t=&lt;unix&gt;,v1=&lt;hex&gt; (ejemplo)</p>
            <pre className="mono overflow-x-auto rounded-xl border border-line bg-surface p-4 text-xs sm:text-sm" tabIndex={0} aria-label="JSON del webhook de ejemplo">
              {JSON.stringify(payload, null, 2)}
            </pre>
            <figcaption className="mt-2 text-sm text-ink2">Webhook (ejemplo)</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
