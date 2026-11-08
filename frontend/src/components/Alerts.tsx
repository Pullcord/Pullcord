import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getExternalAlerts, type ExternalAlert } from "../api";
import { useLang } from "../i18n";

const SEVERITY: Record<ExternalAlert["severity"], { label: [string, string]; color: string }> = {
  info: { label: ["Info", "Info"], color: "var(--info)" },
  warning: { label: ["Advertencia", "Warning"], color: "var(--signal-text)" },
  critical: { label: ["Crítica", "Critical"], color: "var(--err)" },
};

/** Una prueba nunca se presenta como una falla real. */
const isTest = (a: ExternalAlert) => /smoke test|synthetic/i.test(a.message);

const when = (iso: string, locale: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
};

function Badge({ color, children }: { color: string; children: string }) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-xs font-bold tracking-wide" style={{ borderColor: color, color }}>
      {children}
    </span>
  );
}

function AlertItem({ a }: { a: ExternalAlert }) {
  const { L, locale } = useLang();
  const test = isTest(a);
  const sev = SEVERITY[a.severity] ?? SEVERITY.info;
  return (
    <li className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        {test && <Badge color="var(--text)">TEST</Badge>}
        <Badge color={sev.color}>{L(...sev.label)}</Badge>
        <span className="mono text-sm">{a.type}</span>
      </div>
      {/* El mensaje es de la fuente que lo mandó: se muestra tal cual, sin traducir. */}
      <p className="mt-2 [overflow-wrap:anywhere]">{a.message}</p>
      {test && <p className="mt-1 text-sm font-medium">{L("Alerta de prueba: no es una falla real.", "Test alert: not a real failure.")}</p>}
      <p className="mt-2 text-sm text-ink2">
        {L("Fuente", "Source")} <span className="mono">{a.source}</span> · {L("recibida", "received")}{" "}
        <time dateTime={a.received_at}>{when(a.received_at, locale)}</time>
      </p>
    </li>
  );
}

export function Alerts() {
  const { L } = useLang();
  const [alerts, setAlerts] = useState<ExternalAlert[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [showTests, setShowTests] = useState(false); // cerrado por defecto

  useEffect(() => {
    let alive = true;
    const load = () =>
      getExternalAlerts(50).then(
        (list) => alive && (setAlerts(list), setOffline(false)),
        () => alive && setOffline(true),
      );
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Las pruebas nunca van mezcladas con las reales.
  const real = alerts?.filter((a) => !isTest(a));
  const tests = alerts?.filter(isTest);

  const testsLabel = (n: number) =>
    n === 1 ? L("1 alerta de prueba", "1 test alert") : L(`${n} alertas de prueba`, `${n} test alerts`);

  return (
    <section id="alertas" aria-labelledby="alerts-title" className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 id="alerts-title" className="text-3xl font-bold">{L("Alertas externas", "External alerts")}</h2>
        <p className="mt-2 text-ink2">
          {L(
            "Avisos que mandan apps registradas en Pullcord, firmados por cada fuente. Se muestran tal cual llegaron. Por ahora solo se guardan y se muestran aquí: todavía no se reenvían a nadie.",
            "Alerts sent by apps registered with Pullcord, signed by each source. They're shown exactly as they arrived. For now they're only stored and shown here: they aren't forwarded to anyone yet.",
          )}
        </p>
        <div aria-live="polite">
          {real && real.length > 0 && (
            <ul className="mt-6 space-y-3">
              {real.map((a) => (
                <AlertItem key={a.id} a={a} />
              ))}
            </ul>
          )}
          {real && real.length === 0 && (
            <p className="card mt-6 p-5 text-ink2">{L("Todavía no ha llegado ninguna alerta real.", "No real alert has arrived yet.")}</p>
          )}
          {tests && tests.length > 0 && (
            <div className="mt-6">
              <button type="button" className="btn" aria-expanded={showTests} aria-controls="alertas-prueba" onClick={() => setShowTests(!showTests)}>
                <ChevronDown size={18} aria-hidden style={{ transform: showTests ? "rotate(180deg)" : undefined }} />
                {showTests ? L("Ocultar", "Hide") : L("Mostrar", "Show")} {testsLabel(tests.length)}
              </button>
              <ul id="alertas-prueba" hidden={!showTests} className="mt-3 space-y-3">
                {tests.map((a) => (
                  <AlertItem key={a.id} a={a} />
                ))}
              </ul>
            </div>
          )}
          {!alerts && !offline && <p className="mt-6 text-ink2">{L("Cargando…", "Loading…")}</p>}
          <p className="mt-3 text-sm" role="status" style={{ color: "var(--err)" }}>
            {offline ? L("Sin conexión con la API.", "Can't reach the API.") : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
