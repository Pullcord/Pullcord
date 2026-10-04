// Telegram bot by long polling (getUpdates): no public URL needed.
// /start <token> links a chat to a pending subscription; /stop deletes every
// subscription of that chat, including the stored chat ID.
const api = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

async function call(token, method, body, fetchImpl) {
  const res = await fetchImpl(api(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description || res.status}`);
  return json.result;
}

export async function getBotUsername(token, { fetchImpl = fetch } = {}) {
  return (await call(token, "getMe", {}, fetchImpl)).username;
}

export async function handleUpdate(update, { store, token, fetchImpl = fetch }) {
  const msg = update.message;
  if (!msg?.text) return;
  const chatId = msg.chat.id;
  const reply = (text) => call(token, "sendMessage", { chat_id: chatId, text }, fetchImpl);
  const [cmd, arg] = msg.text.trim().split(/\s+/, 2);

  if (cmd === "/start" && arg) {
    const sub = store.linkTelegram(arg, chatId);
    if (!sub) return reply("Ese enlace no es válido o ya se usó.");
    return reply(`Listo. Te aviso cuando ${sub.address} reciba un pago.\n/stop borra tus suscripciones y tu chat ID.`);
  }
  if (cmd === "/stop") {
    const n = store.deleteByChat(chatId);
    return reply(n ? `Borré ${n} suscripción(es) y tu chat ID.` : "No tienes suscripciones.");
  }
  return reply("Pullcord solo avisa; nunca mueve fondos. Para suscribirte usa el enlace que te dio la app. /stop borra tus datos.");
}

export function startTelegram(cfg, { store, fetchImpl = fetch, log = console.log } = {}) {
  let stopped = false;
  let offset = 0;
  const loop = async () => {
    while (!stopped) {
      try {
        const updates = await call(cfg.telegramBotToken, "getUpdates", { offset, timeout: 25, allowed_updates: ["message"] }, fetchImpl);
        for (const u of updates) {
          offset = u.update_id + 1;
          await handleUpdate(u, { store, token: cfg.telegramBotToken, fetchImpl }).catch((e) => log(`telegram reply failed: ${e.message}`));
        }
      } catch (err) {
        log(`telegram poll error: ${err.message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };
  loop();
  return { stop: () => { stopped = true; } };
}
