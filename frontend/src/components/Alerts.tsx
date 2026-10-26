import { useEffect, useState } from "react";
import { getExternalAlerts, type ExternalAlert } from "../api";

const SEVERITY: Record<ExternalAlert["severity"], { label: string; color: string }> = {
  info: { label: "Info", color: "var(--info)" },
  warning: { label: "Advertencia", color: "var(--signal-text)" },
  critical: { label: "Crítica", color: "var(--err)" },
};

/** Una prueba nunca se presenta como una falla real. */
const isTest = (a: ExternalAlert) => /smoke test|synthetic/i.test(a.message);

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
};

function Badge({ color, children }: { color: string; children: string }) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-xs font-bold tracking-wide" style={{ borderColor: color, color }}>
      {children}
    </span>
  );
}

function AlertItem({ a }: { a: ExternalAlert }) {
  const test = isTest(a);
  const sev = SEVERITY[a.severity] ?? SEVERITY.info;
  return (
    <li className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        {test && <Badge color="var(--text)">TEST</Badge>}
        <Badge color={sev.color}>{sev.label}</Badge>
        <span className="mono text-sm">{a.type}</span>
      </div>
      <p className="mt-2 [overflow-wrap:anywhere]">{a.message}</p>
      {test && <p className="mt-1 text-sm font-medium">Alerta de prueba: no es una falla real.</p>}
      <p className="mt-2 text-sm text-ink2">
        Fuente <span className="mono">{a.source}</span> · recibida <time dateTime={a.received_at}>{when(a.received_at)}</time>
      </p>
    </li>
  );
}

export function Alerts() {
  const [alerts, setAlerts] = useState<ExternalAlert[] | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getExternalAlerts().then(
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

  return (
    <section id="alertas" aria-labelledby="alerts-title" className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 id="alerts-title" className="text-3xl font-bold">Alertas externas</h2>
        <p className="mt-2 text-ink2">
          Avisos que mandan apps registradas en Pullcord, firmados por cada fuente. Se muestran tal cual llegaron. Por ahora solo se guardan y se
          muestran aquí: todavía no se reenvían a nadie.
        </p>
        <div aria-live="polite">
          {alerts && alerts.length > 0 && (
            <ul className="mt-6 space-y-3">
              {alerts.map((a) => (
                <AlertItem key={a.id} a={a} />
              ))}
            </ul>
          )}
          {alerts && alerts.length === 0 && <p className="card mt-6 p-5 text-ink2">Todavía no ha llegado ninguna alerta externa.</p>}
          {!alerts && !offline && <p className="mt-6 text-ink2">Cargando…</p>}
          <p className="mt-3 text-sm" role="status" style={{ color: "var(--err)" }}>
            {offline ? "Sin conexión con la API." : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
