// Read-only Horizon access: signers and thresholds of a classic account (G...).

export async function getAccount(accountId, { horizonUrl, fetchImpl = fetch }) {
  const res = await fetchImpl(`${horizonUrl.replace(/\/$/, "")}/accounts/${accountId}`);
  if (res.status === 404) return { exists: false };
  if (!res.ok) throw new Error(`Horizon HTTP ${res.status}`);
  const d = await res.json();
  return {
    exists: true,
    thresholds: {
      low: d.thresholds.low_threshold,
      medium: d.thresholds.med_threshold,
      high: d.thresholds.high_threshold,
    },
    signers: d.signers.map((s) => ({ key: s.key, weight: s.weight, type: s.type })),
  };
}
