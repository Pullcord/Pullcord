import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Download, ExternalLink, Loader2, Send, Webhook } from "lucide-react";
import {
  ApiError,
  createSubscription,
  getChallenge,
  getSubscription,
  type Challenge,
  type Created,
} from "../api";
import { connect, detectFreighter, readNetwork, signChallenge } from "../wallet";
import { downloadTxt, shortAddr, useReducedMotion, webhookProblem } from "../util";
import { CopyButton } from "./CopyButton";
import { LedSign } from "./LedSign";
import { ConsentPanel } from "./ConsentPanel";
import type { ConsentInfo } from "../consent";
import { tr, useLang } from "../i18n";

type ChannelKind = "telegram" | "webhook";
const STEPS: [string, string][] = [
  ["Wallet", "Wallet"],
  ["Canal", "Channel"],
  ["Firma", "Sign"],
  ["Listo", "Done"],
];
const WARNING_LINE = "This signature does not move funds or authorize any transaction.";

function ErrorBox({ message, original }: { message: string; original?: string }) {
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-err p-3 text-sm">
      <AlertTriangle className="mt-0.5 shrink-0 text-err" size={18} aria-hidden />
      <div>
        <p className="font-medium text-err">{message}</p>
        {original && <p className="mono mt-1 text-xs text-ink2">Original: {original}</p>}
      </div>
    </div>
  );
}

// Se guarda el error crudo y se describe al mostrarlo: así un error de la API sigue el idioma si se cambia después.
type Raw = { error: unknown };
const asError = (e: unknown): Raw => ({ error: e });
const describe = ({ error: e }: Raw): { message: string; original?: string } =>
  e instanceof ApiError
    ? { message: e.friendly, original: e.message }
    : { message: e instanceof Error ? e.message : tr("Algo salió mal.", "Something went wrong.") };

export function Wizard() {
  const reduced = useReducedMotion();
  const { L } = useLang();
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelKind>("webhook");
  const [webhook, setWebhook] = useState("");
  const [appLabel, setAppLabel] = useState("");
  const [done, setDone] = useState<Created | null>(null);
  const [consent, setConsent] = useState<ConsentInfo | null>(null);

  const reset = () => {
    setStep(2);
    setDone(null);
    setConsent(null);
  };

  return (
    <section id="suscribir" aria-labelledby="sus-title" className="scroll-mt-4 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 id="sus-title" className="text-3xl font-bold">{L("Suscribe una dirección", "Subscribe an address")}</h2>
        <p className="mt-2 text-ink2">{L("Cuatro pasos. Firmas un permiso y listo: nada se mueve de tu cuenta.", "Four steps. You sign a permission and that's it: nothing leaves your account.")}</p>

        <div
          role="progressbar"
          aria-label={L("Progreso", "Progress")}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={step}
          aria-valuetext={L(`Paso ${step} de 4: ${STEPS[step - 1][0]}`, `Step ${step} of 4: ${STEPS[step - 1][1]}`)}
          className="mt-6"
        >
          <ol className="grid grid-cols-4 gap-2 text-sm">
            {STEPS.map((s, i) => (
              <li key={s[0]} className={i + 1 <= step ? "text-ink" : "text-ink2"}>
                <div className="h-1.5 rounded-full" style={{ background: i + 1 <= step ? "var(--signal)" : "var(--border)" }} />
                <span className="mt-1 block">
                  {i + 1}. {L(...s)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="card mt-6 p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduced ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24 }}
              transition={{ duration: reduced ? 0 : 0.22 }}
            >
              {step === 1 && <StepWallet address={address} setAddress={setAddress} next={() => setStep(2)} />}
              {step === 2 && (
                <StepChannel
                  channel={channel}
                  setChannel={setChannel}
                  webhook={webhook}
                  setWebhook={setWebhook}
                  appLabel={appLabel}
                  setAppLabel={setAppLabel}
                  back={() => setStep(1)}
                  next={() => setStep(3)}
                />
              )}
              {step === 3 && address && (
                <StepSign
                  address={address}
                  channel={channel}
                  webhook={webhook}
                  appLabel={appLabel}
                  back={() => setStep(2)}
                  onDone={(c, k) => {
                    setDone(c);
                    setConsent(k);
                    setStep(4);
                  }}
                />
              )}
              {step === 4 && done && <StepDone data={done} consent={consent} again={reset} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ---------- Paso 1: wallet ---------- */
function StepWallet({ address, setAddress, next }: { address: string | null; setAddress: (a: string | null) => void; next: () => void }) {
  const { L } = useLang();
  const [freighter, setFreighter] = useState<"checking" | "yes" | "no">("checking");
  const [testnet, setTestnet] = useState<boolean | null>(null);
  const [netName, setNetName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setFreighter("checking");
    setError(null);
    try {
      const ok = await detectFreighter();
      setFreighter(ok ? "yes" : "no");
      if (ok) {
        const n = await readNetwork();
        setTestnet(n.isTestnet);
        setNetName(n.network);
      }
    } catch (e) {
      setFreighter("no");
      setError(e instanceof Error ? e.message : tr("No pude hablar con Freighter.", "Couldn't talk to Freighter."));
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const doConnect = async () => {
    setBusy(true);
    setError(null);
    try {
      setAddress(await connect());
      const n = await readNetwork();
      setTestnet(n.isTestnet);
      setNetName(n.network);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("No pude conectar.", "Couldn't connect."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold">1. {L("Conecta tu wallet", "Connect your wallet")}</h3>
      {freighter === "checking" && (
        <p className="mt-4 flex items-center gap-2 text-ink2" role="status">
          <Loader2 className="animate-spin" size={18} aria-hidden /> {L("Buscando Freighter…", "Looking for Freighter…")}
        </p>
      )}
      {freighter === "no" && (
        <div className="mt-4 space-y-3">
          <p>
            {L("No encontré ", "Couldn't find ")}
            <strong>Freighter</strong>
            {L(
              ". Es una wallet de Stellar que vive como extensión del navegador. Con ella firmas el permiso sin compartir tu llave secreta.",
              ". It's a Stellar wallet that lives as a browser extension. With it you sign the permission without sharing your secret key.",
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <a className="btn btn-primary" href="https://www.freighter.app/" target="_blank" rel="noreferrer">
              {L("Instalar Freighter", "Install Freighter")} <ExternalLink size={16} aria-hidden />
            </a>
            <button type="button" className="btn" onClick={check}>
              {L("Ya la instalé, revisar de nuevo", "I installed it, check again")}
            </button>
          </div>
        </div>
      )}
      {freighter === "yes" && (
        <div className="mt-4 space-y-4">
          {!address ? (
            <>
              <p className="text-ink2">{L("Freighter te va a pedir permiso para ver tu dirección pública. Nada más.", "Freighter will ask for permission to see your public address. Nothing else.")}</p>
              <button type="button" className="btn btn-primary" onClick={doConnect} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : null}
                {busy ? L("Esperando a Freighter…", "Waiting for Freighter…") : L("Conectar Freighter", "Connect Freighter")}
              </button>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <CheckCircle2 className="text-ok" aria-hidden />
              <span className="mono text-lg" title={address}>
                {shortAddr(address)}
              </span>
              <CopyButton text={address} label={L("dirección", "address")} />
            </div>
          )}
          {address && testnet === false && (
            <ErrorBox
              message={L(
                `Freighter está en la red ${netName || "equivocada"}. Cámbiala a Testnet en Freighter y revisa de nuevo.`,
                `Freighter is on the ${netName || "wrong"} network. Switch it to Testnet in Freighter and check again.`,
              )}
            />
          )}
          {address && (
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn" onClick={doConnect}>
                {L("Revisar red", "Check network")}
              </button>
              <button type="button" className="btn btn-primary" onClick={next} disabled={testnet !== true}>
                {L("Continuar", "Continue")} <ArrowRight size={18} aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}
      <div aria-live="polite" className="mt-4">
        {error && <ErrorBox message={error} />}
      </div>
    </div>
  );
}

/* ---------- Paso 2: canal ---------- */
function StepChannel(p: {
  channel: ChannelKind;
  setChannel: (c: ChannelKind) => void;
  webhook: string;
  setWebhook: (v: string) => void;
  appLabel: string;
  setAppLabel: (v: string) => void;
  back: () => void;
  next: () => void;
}) {
  const { L } = useLang();
  const wProblem = webhookProblem(p.webhook);
  const labelBad = p.appLabel.length > 40 || !/^[\x20-\x7e]*$/.test(p.appLabel);
  const canGo = !labelBad && (p.channel === "telegram" || (p.webhook.length > 0 && !wProblem));
  const cards: { id: ChannelKind; title: string; text: string; icon: typeof Send }[] = [
    { id: "telegram", title: "Telegram", text: L("Te llega un mensaje del bot. Vinculas tu chat con un enlace.", "You get a message from the bot. You link your chat with a link."), icon: Send },
    { id: "webhook", title: "Webhook", text: L("Pullcord llama a tu URL con un aviso firmado con HMAC.", "Pullcord calls your URL with an HMAC-signed alert."), icon: Webhook },
  ];
  return (
    <div>
      <h3 className="text-xl font-bold">2. {L("Elige cómo quieres el aviso", "Choose how you want the alert")}</h3>
      <fieldset className="mt-4">
        <legend className="sr-only">{L("Canal de aviso", "Alert channel")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <label
              key={c.id}
              className="cursor-pointer rounded-xl border p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2"
              style={{
                borderColor: p.channel === c.id ? "var(--signal-text)" : "var(--control)",
                background: p.channel === c.id ? "var(--elevated)" : "transparent",
                outlineColor: "var(--text)",
              }}
            >
              <input type="radio" name="canal" className="sr-only" checked={p.channel === c.id} onChange={() => p.setChannel(c.id)} />
              <c.icon aria-hidden className="text-signal-text" />
              <span className="mt-2 block text-lg font-bold">{c.title}</span>
              <span className="mt-1 block text-sm text-ink2">{c.text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-4 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--control)" }}>
        {L("¿Solo quieres probar? Abre", "Just want to try it? Open")}{" "}
        <a className="text-signal-text underline" href="https://webhook.site/" target="_blank" rel="noreferrer">
          webhook.site
        </a>
        {L(
          ", copia la URL que te da, elige Webhook y pégala aquí. Ahí ves llegar el aviso en segundos, sin crear cuenta.",
          ", copy the URL it gives you, choose Webhook and paste it here. You'll see the alert arrive there within seconds, no account needed.",
        )}
      </p>

      {p.channel === "webhook" && (
        <div className="mt-5">
          <label htmlFor="webhook" className="font-medium">
            {L("URL del webhook", "Webhook URL")}
          </label>
          <input
            id="webhook"
            className="field mono mt-1"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder={L("https://webhook.site/tu-id", "https://webhook.site/your-id")}
            value={p.webhook}
            onChange={(e) => p.setWebhook(e.target.value.trim())}
            aria-invalid={Boolean(wProblem)}
            aria-describedby="webhook-help"
          />
          <p id="webhook-help" className="mt-1 text-sm" style={{ color: wProblem ? "var(--err)" : "var(--text-2)" }} aria-live="polite">
            {wProblem ? `${wProblem.replace(/\.$/, "")}. ` : L("Tiene que ser https. ", "It has to be https. ")}
            {L("Para probar, abre", "To try it, open")}{" "}
            <a className="text-signal-text underline" href="https://webhook.site/" target="_blank" rel="noreferrer">
              webhook.site
            </a>
            {L(": te da una URL pública donde ves llegar los avisos.", ": it gives you a public URL where you can watch the alerts arrive.")}
          </p>
        </div>
      )}

      <div className="mt-5">
        <label htmlFor="applabel" className="font-medium">
          {L("Nombre de tu app", "Your app's name")} <span className="text-ink2">{L("(opcional)", "(optional)")}</span>
        </label>
        <input
          id="applabel"
          className="field mt-1"
          maxLength={60}
          autoComplete="off"
          value={p.appLabel}
          onChange={(e) => p.setAppLabel(e.target.value)}
          aria-invalid={labelBad}
          aria-describedby="applabel-help"
        />
        <p id="applabel-help" className="mt-1 text-sm" style={{ color: labelBad ? "var(--err)" : "var(--text-2)" }}>
          {L(
            "Es el nombre de la app, no pongas datos personales. Máximo 40 caracteres ASCII",
            "It's the app's name, don't add personal data. 40 ASCII characters max",
          )}{" "}
          ({p.appLabel.length}/40).
        </p>
      </div>

      <div className="mt-5">
        <span className="font-medium">{L("Evento", "Event")}</span>
        <p className="mt-1">
          <span className="inline-block rounded-full border border-control px-3 py-1 text-sm">{L("Pago recibido", "Payment received")}</span>
          <span className="ml-2 text-sm text-ink2">{L("Fijo: es el único evento del MVP.", "Fixed: it's the only event in the MVP.")}</span>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={p.back}>
          <ArrowLeft size={18} aria-hidden /> {L("Atrás", "Back")}
        </button>
        <button type="button" className="btn btn-primary" onClick={p.next} disabled={!canGo}>
          {L("Continuar", "Continue")} <ArrowRight size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ---------- Paso 3: firmar ---------- */
function useCountdown(expiresAt: string | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setLeft(Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return left;
}

function StepSign(p: {
  address: string;
  channel: ChannelKind;
  webhook: string;
  appLabel: string;
  back: () => void;
  onDone: (c: Created, consent: ConsentInfo | null) => void;
}) {
  const { L } = useLang();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"idle" | "wallet" | "verifying">("idle");
  const [error, setError] = useState<Raw | null>(null);
  const left = useCountdown(challenge?.expiresAt ?? null);
  const expired = challenge !== null && left === 0;
  const requested = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setChallenge(await getChallenge(p.address));
    } catch (e) {
      setChallenge(null);
      setError(asError(e));
    } finally {
      setLoading(false);
    }
  }, [p.address]);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    load();
  }, [load]);

  const sign = async () => {
    if (!challenge) return;
    setError(null);
    setPhase("wallet");
    try {
      const signature = await signChallenge(challenge.message, p.address);
      setPhase("verifying");
      const created = await createSubscription({
        address: p.address,
        channel: p.channel === "telegram" ? { telegram: true } : { webhook: p.webhook },
        nonce: challenge.nonce,
        signature,
        appLabel: p.appLabel.trim() || undefined,
      });
      p.onDone(created, challenge.consent ?? null);
    } catch (e) {
      setError(asError(e));
      setPhase("idle");
    }
  };

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const lines = challenge?.message.split("\n") ?? [];

  return (
    <div>
      <h3 className="text-xl font-bold">3. {L("Firma el permiso", "Sign the permission")}</h3>
      {loading && (
        <p className="mt-4 flex items-center gap-2 text-ink2" role="status">
          <Loader2 className="animate-spin" size={18} aria-hidden /> {L("Pidiendo el reto…", "Requesting the challenge…")}
        </p>
      )}
      {challenge && (
        <>
          <div className="mt-4 rounded-xl border border-line bg-elevated p-4" aria-label={L("Mensaje a firmar", "Message to sign")} role="group">
            {lines.map((l, i) =>
              l === WARNING_LINE ? (
                <p key={i} className="mono my-1 rounded-lg border border-signal-text p-2 text-sm">
                  {l}
                  <span className="mt-1 block font-sans font-semibold text-signal-text">
                    {L("Esta firma no mueve fondos ni autoriza ninguna transacción.", "This signature doesn't move funds or authorize any transaction.")}
                  </span>
                </p>
              ) : (
                <p key={i} className="mono text-sm">
                  {l}
                </p>
              ),
            )}
          </div>
          <p className="mt-3 text-sm" role="timer" aria-live="off">
            {expired ? (
              <span className="text-err">{L("El reto venció.", "The challenge expired.")}</span>
            ) : (
              <>
                {L("El reto vence en", "The challenge expires in")} <strong className="mono">{mm}:{ss}</strong>. {L("Es de un solo uso.", "It's single-use.")}
              </>
            )}
          </p>
        </>
      )}

      <div className="mt-4" aria-live="polite">
        {phase === "wallet" && <p role="status">{L("Esperando a Freighter: confirma la firma en la ventana de la wallet.", "Waiting for Freighter: confirm the signature in the wallet window.")}</p>}
        {phase === "verifying" && (
          <p role="status" className="flex items-center gap-2">
            <Loader2 className="animate-spin" size={18} aria-hidden /> {L("Verificando la firma…", "Checking the signature…")}
          </p>
        )}
        {error && <ErrorBox {...describe(error)} />}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={p.back} disabled={phase !== "idle"}>
          <ArrowLeft size={18} aria-hidden /> {L("Atrás", "Back")}
        </button>
        {(expired || (!challenge && !loading)) && (
          <button type="button" className="btn" onClick={load}>
            {L("Pedir otro reto", "Request a new challenge")}
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={sign} disabled={!challenge || expired || phase !== "idle"}>
          {phase === "idle" ? L("Firmar con Freighter", "Sign with Freighter") : phase === "wallet" ? L("Esperando la wallet…", "Waiting for the wallet…") : L("Verificando…", "Checking…")}
        </button>
      </div>
    </div>
  );
}

/* ---------- Paso 4: listo ---------- */
function Secret({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-sm text-ink2">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <code className="mono min-w-0 flex-1 text-sm">{value}</code>
        <CopyButton text={value} label={label} />
      </div>
    </div>
  );
}

function StepDone({ data, consent, again }: { data: Created; consent: ConsentInfo | null; again: () => void }) {
  const reduced = useReducedMotion();
  const { L } = useLang();
  const [qr, setQr] = useState<string | null>(null);
  const [linked, setLinked] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<Raw | null>(null);

  useEffect(() => {
    if (!data.telegramLink) return;
    let alive = true;
    import("qrcode").then((m) =>
      m.default.toDataURL(data.telegramLink!, { margin: 2, width: 240, color: { dark: "#12151C", light: "#FFFFFF" } }).then((u) => alive && setQr(u)),
    );
    return () => {
      alive = false;
    };
  }, [data.telegramLink]);

  const check = async () => {
    setChecking(true);
    setError(null);
    try {
      setLinked((await getSubscription(data.id, data.manageToken)).linked);
    } catch (e) {
      setError(asError(e));
    } finally {
      setChecking(false);
    }
  };

  const txt = [
    "Pullcord (testnet)",
    `${L("Dirección", "Address")}: ${data.address}`,
    `${L("Canal", "Channel")}: ${data.channel}`,
    `ID: ${data.id}`,
    `manageToken: ${data.manageToken}`,
    ...(data.secret ? [`Secret HMAC: ${data.secret}`] : []),
    "",
    L("Guarda este archivo. Con el ID y el manageToken puedes darte de baja.", "Keep this file. With the ID and manageToken you can unsubscribe."),
  ].join("\n");

  return (
    <div>
      <motion.div
        className="flex flex-col items-center gap-3 text-center"
        initial={reduced ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
      >
        <LedSign lines={L("AVISO|SOLICITADO", "ALERT|REQUESTED").split("|")} lit label={L("Aviso solicitado", "Alert requested")} />
        <h3 className="text-2xl font-bold" role="status">
          {L("Listo, quedaste suscrito", "Done, you're subscribed")}
        </h3>
        <p className="text-ink2">
          {L("Te avisamos cuando", "We'll notify you when")} <span className="mono">{shortAddr(data.address)}</span> {L("reciba un pago. Solo testnet.", "receives a payment. Testnet only.")}
        </p>
      </motion.div>

      {data.telegramLink && (
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-3">
            <a className="btn btn-primary w-full !min-h-14 text-lg" href={data.telegramLink} target="_blank" rel="noreferrer">
              {L("Abrir en Telegram", "Open in Telegram")} <ExternalLink size={18} aria-hidden />
            </a>
            <p className="text-sm text-ink2">{L("Toca Iniciar en el bot. Sin ese paso no te puede escribir.", "Tap Start in the bot. Without that step it can't message you.")}</p>
            <button type="button" className="btn" onClick={check} disabled={checking}>
              {checking ? <Loader2 className="animate-spin" size={18} aria-hidden /> : null} {L("Ya lo vinculé", "I linked it")}
            </button>
            <div aria-live="polite">
              {linked === true && <p className="font-medium text-ok">{L("Vinculado. Ya te puede avisar.", "Linked. It can notify you now.")}</p>}
              {linked === false && <p className="text-signal-text">{L("Todavía no está vinculado. Abre el enlace e inicia el bot.", "Not linked yet. Open the link and start the bot.")}</p>}
              {error && <ErrorBox {...describe(error)} />}
            </div>
          </div>
          {qr && <img src={qr} width={200} height={200} alt={L("Código QR del enlace de Telegram para abrirlo desde el celular", "QR code for the Telegram link, to open it from your phone")} className="rounded-xl bg-white" />}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {data.secret && (
          <>
            <Secret label={L("Secret del webhook", "Webhook secret")} value={data.secret} />
            <p className="text-sm text-ink2">
              {L("El secret sirve para verificar la firma HMAC de cada aviso (cabecera", "The secret lets you verify the HMAC signature of each alert (header")} <span className="mono">pullcord-signature</span>). {L("No lo compartas.", "Don't share it.")}
            </p>
          </>
        )}
        <Secret label={L("ID de la suscripción", "Subscription ID")} value={data.id} />
        <Secret label="manageToken" value={data.manageToken} />
        <div role="note" className="flex gap-3 rounded-xl border border-signal-text p-3 text-sm">
          <AlertTriangle className="shrink-0 text-signal-text" size={18} aria-hidden />
          <p>
            {L("Se muestran una sola vez. Guárdalos para poder darte de baja. No los guardamos en tu navegador: si recargas esta página, se pierden.", "They're shown only once. Save them so you can unsubscribe. We don't store them in your browser: if you reload this page, they're gone.")}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => downloadTxt(L("pullcord-suscripcion.txt", "pullcord-subscription.txt"), txt)}>
          <Download size={18} aria-hidden /> {L("Descargar como .txt", "Download as .txt")}
        </button>
      </div>

      {consent && (
        <div className="mt-6">
          <ConsentPanel address={data.address} info={consent} mode="register" />
        </div>
      )}

      <div className="mt-8 rounded-xl bg-elevated p-4">
        <h4 className="font-display text-lg font-bold">{L("Pruébalo ahora", "Try it now")}</h4>
        <p className="mt-1 text-ink2">
          {L("Envía un pago de testnet a tu dirección desde otra cuenta, por ejemplo con", "Send a testnet payment to your address from another account, for example with")}{" "}
          <a className="text-signal-text underline" href="https://lab.stellar.org/" target="_blank" rel="noreferrer">
            Stellar Laboratory
          </a>
          {L(". El aviso llega en unos segundos.", ". The alert arrives within a few seconds.")}
        </p>
      </div>

      <button type="button" className="btn mt-6" onClick={again}>
        {L("Suscribir otra configuración", "Subscribe another setup")}
      </button>
    </div>
  );
}
