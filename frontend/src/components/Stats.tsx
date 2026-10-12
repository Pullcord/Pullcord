import { useEffect, useState } from "react";
import { animate } from "motion/react";
import { getStats, type Stats as StatsData } from "../api";
import { useReducedMotion } from "../util";

function Counter({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const c = animate(shown, value, { duration: 0.8, onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced]);
  return <>{shown.toLocaleString("es-MX")}</>;
}

export function Stats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getStats().then(
        (s) => alive && (setData(s), setOffline(false)),
        () => alive && setOffline(true),
      );
    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const items: [string, keyof StatsData][] = [
    ["Apps integradas", "appsIntegrated"],
    ["Suscripciones", "subscriptions"],
    ["Avisos enviados", "notificationsSent"],
  ];

  return (
    <section aria-labelledby="stats-title" className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 id="stats-title" className="text-3xl font-bold">En vivo</h2>
        <p className="mt-2 text-ink2">Solo conteos de la API. Se actualizan cada 10 segundos.</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          {items.map(([label, key]) => (
            <div key={key} className="card p-5">
              <dt className="text-sm text-ink2">{label}</dt>
              <dd className="mt-1 font-display text-4xl font-bold">{data ? <Counter value={data[key]} /> : "-"}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm" role="status" style={{ color: "var(--err)" }}>
          {offline ? "Sin conexión con la API." : ""}
        </p>
      </div>
    </section>
  );
}
