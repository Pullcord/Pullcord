// Off-chain store for subscriptions. Personal data (Telegram chat ID, webhook
// URL) lives only here, never on chain, and is removed when the subscription
// is deleted. Uses Node's built-in SQLite (node:sqlite).
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, createHash } from "node:crypto";

const token = (bytes = 24) => randomBytes(bytes).toString("base64url");
const hash = (s) => createHash("sha256").update(s).digest("hex");

export function openStore(path = ":memory:") {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      events TEXT NOT NULL,
      channel TEXT NOT NULL,             -- 'webhook' | 'telegram'
      webhook_url TEXT,
      webhook_secret TEXT,
      telegram_chat_id TEXT,
      telegram_link_token TEXT UNIQUE,
      manage_token_hash TEXT NOT NULL,
      ownership_proof TEXT NOT NULL DEFAULT 'none', -- 'sep53' | 'none'
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS subscriptions_address ON subscriptions(address);
    CREATE TABLE IF NOT EXISTS deliveries (
      event_id TEXT NOT NULL,
      subscription_id TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (event_id, subscription_id)
    );
    CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    -- One-time nonces for SEP-53 ownership proofs.
    CREATE TABLE IF NOT EXISTS challenges (
      nonce TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      message TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);
  try {
    db.exec("ALTER TABLE subscriptions ADD COLUMN ownership_proof TEXT NOT NULL DEFAULT 'none'");
  } catch {
    // column already exists
  }

  const now = () => new Date().toISOString();
  const row = (r) => (r ? { ...r, events: JSON.parse(r.events) } : null);

  return {
    db,

    // Returns the subscription plus the secrets shown once to the caller.
    create({ address, events, channel, webhookUrl = null, ownershipProof = "none" }) {
      const id = randomUUID();
      const manageToken = token();
      const webhookSecret = channel === "webhook" ? token(32) : null;
      const telegramLinkToken = channel === "telegram" ? token(16) : null;
      db.prepare(
        `INSERT INTO subscriptions (id, address, events, channel, webhook_url, webhook_secret, telegram_link_token, manage_token_hash, ownership_proof, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, address, JSON.stringify(events), channel, webhookUrl, webhookSecret, telegramLinkToken, hash(manageToken), ownershipProof, now());
      return { ...this.get(id), manageToken, webhookSecret, telegramLinkToken };
    },

    get(id) {
      return row(db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id));
    },

    authorize(id, manageToken) {
      const sub = this.get(id);
      return sub && manageToken && sub.manage_token_hash === hash(manageToken) ? sub : null;
    },

    // Deleting a subscription removes its personal data and its delivery log.
    delete(id) {
      db.prepare("DELETE FROM deliveries WHERE subscription_id = ?").run(id);
      return db.prepare("DELETE FROM subscriptions WHERE id = ?").run(id).changes > 0;
    },

    // Only subscriptions ready to deliver: Telegram ones need a linked chat.
    byAddress(address) {
      return db
        .prepare("SELECT * FROM subscriptions WHERE address = ? AND (channel = 'webhook' OR telegram_chat_id IS NOT NULL)")
        .all(address)
        .map(row);
    },

    linkTelegram(linkToken, chatId) {
      const sub = db.prepare("SELECT id FROM subscriptions WHERE telegram_link_token = ?").get(linkToken);
      if (!sub) return null;
      db.prepare("UPDATE subscriptions SET telegram_chat_id = ?, telegram_link_token = NULL WHERE id = ?").run(String(chatId), sub.id);
      return this.get(sub.id);
    },

    deleteByChat(chatId) {
      const ids = db.prepare("SELECT id FROM subscriptions WHERE telegram_chat_id = ?").all(String(chatId)).map((r) => r.id);
      for (const id of ids) this.delete(id);
      return ids.length;
    },

    // Claims a delivery slot. False if this event was already handled for this subscription.
    claimDelivery(eventId, subscriptionId) {
      return db
        .prepare("INSERT OR IGNORE INTO deliveries (event_id, subscription_id, status, updated_at) VALUES (?, ?, 'pending', ?)")
        .run(eventId, subscriptionId, now()).changes > 0;
    },

    finishDelivery(eventId, subscriptionId, status, attempts) {
      db.prepare("UPDATE deliveries SET status = ?, attempts = ?, updated_at = ? WHERE event_id = ? AND subscription_id = ?").run(
        status, attempts, now(), eventId, subscriptionId,
      );
    },

    saveChallenge({ nonce, address, message, expiresAt }) {
      db.prepare("DELETE FROM challenges WHERE expires_at < ?").run(Date.now());
      db.prepare("INSERT INTO challenges (nonce, address, message, expires_at) VALUES (?, ?, ?, ?)").run(nonce, address, message, expiresAt);
    },

    // Single use: the challenge is deleted whether or not the caller's signature verifies.
    takeChallenge(nonce, address) {
      const c = db.prepare("SELECT * FROM challenges WHERE nonce = ? AND address = ?").get(String(nonce), address);
      if (!c) return null;
      db.prepare("DELETE FROM challenges WHERE nonce = ?").run(c.nonce);
      return c.expires_at >= Date.now() ? c : null;
    },

    getState(key) {
      return db.prepare("SELECT value FROM state WHERE key = ?").get(key)?.value ?? null;
    },

    setState(key, value) {
      db.prepare("INSERT INTO state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, String(value));
    },

    close() {
      db.close();
    },
  };
}
