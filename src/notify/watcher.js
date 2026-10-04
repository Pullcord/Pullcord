// Polls every `transfer` event with a persistent cursor and matches the `to`
// address against subscriptions in memory. One filter for all subscribers
// avoids getEvents' per-request filter limits. The cursor is saved after each
// page, so a restart resumes where it stopped (within RPC's ~7-day retention).
import { getLatestLedger, getTransferPage } from "./events.js";
import { deliver } from "./dispatch.js";

const CURSOR_KEY = "transfer_cursor";

// Processes pages until caught up. Returns how many transfers matched.
export async function pollOnce(cfg, { store, fetchImpl = fetch, log = () => {}, retryDelayMs } = {}) {
  let cursor = store.getState(CURSOR_KEY);
  let startLedger = null;
  if (!cursor) {
    // First run: start at the tip; history before the service existed is not notified.
    startLedger = await getLatestLedger(cfg.notifyRpcUrl, { fetchImpl });
    log(`watcher: no cursor, starting at ledger ${startLedger}`);
  }

  let matched = 0;
  for (let page = 0; page < cfg.maxPagesPerPoll; page++) {
    const res = await getTransferPage(cfg.notifyRpcUrl, { cursor, startLedger, limit: cfg.pageLimit, fetchImpl });
    const jobs = [];
    for (const t of res.events) {
      for (const sub of store.byAddress(t.to)) {
        if (!sub.events.includes("payment.received")) continue;
        matched++;
        jobs.push(deliver(sub, t, cfg, { store, fetchImpl, retryDelayMs }));
      }
    }
    const results = await Promise.allSettled(jobs);
    for (const r of results) if (r.status === "rejected" || r.value?.ok === false) log(`delivery failed: ${r.reason?.message || r.value?.error}`);

    if (res.cursor) {
      cursor = res.cursor;
      startLedger = null;
      store.setState(CURSOR_KEY, cursor);
    }
    if (res.rawCount < cfg.pageLimit) break; // caught up
  }
  return matched;
}

export function startWatcher(cfg, { store, fetchImpl = fetch, log = console.log } = {}) {
  let stopped = false;
  let failures = 0;
  const loop = async () => {
    while (!stopped) {
      try {
        await pollOnce(cfg, { store, fetchImpl, log });
        failures = 0;
      } catch (err) {
        failures++;
        log(`watcher error (${failures}): ${err.message}`);
        // A cursor older than RPC retention is rejected forever: restart at the tip and say so.
        if (failures >= 5 && store.getState(CURSOR_KEY)) {
          log("watcher: dropping cursor after repeated errors; events in the gap are not notified");
          store.setState(CURSOR_KEY, "");
          failures = 0;
        }
      }
      await new Promise((r) => setTimeout(r, cfg.pollIntervalMs));
    }
  };
  loop();
  return { stop: () => { stopped = true; } };
}
