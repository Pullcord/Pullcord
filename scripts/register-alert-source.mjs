// Registers a new external alert source (POST /v1/alerts/external) and
// prints its HMAC secret once. There is no public registration endpoint on
// purpose: a source only exists if someone with access to this database ran
// this script for it.
// Uso: node scripts/register-alert-source.mjs <source-name>
import { loadConfig } from "../src/config.js";
import { openStore } from "../src/notify/store.js";

const name = process.argv[2];
if (!name) {
  console.error("uso: node scripts/register-alert-source.mjs <source-name>");
  process.exit(1);
}

const store = openStore(loadConfig().dbPath);
const existing = store.getAlertSource(name);
if (existing) {
  console.error(`la fuente "${name}" ya existe (el secreto no se muestra dos veces; borra la fila en alert_sources para regenerarlo)`);
  store.close();
  process.exit(1);
}

const { secret } = store.createAlertSource(name);
console.log(`source: ${name}`);
console.log(`secret: ${secret}`);
console.log("(se muestra una sola vez; guárdalo)");
store.close();
