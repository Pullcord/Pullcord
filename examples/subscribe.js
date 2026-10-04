import { Pullcord } from "@pullcord/notify";

const pullcord = new Pullcord({ url: process.env.PULLCORD_URL });

const sub = await pullcord.subscribe({
  address: process.argv[2],                       // G... or C... on testnet
  events: ["payment.received"],
  channel: process.argv[3] ? { webhook: process.argv[3] } : { telegram: true },
});

if (sub.telegramLink) console.log("Open in Telegram:", sub.telegramLink);
if (sub.secret) console.log("Webhook secret (save it):", sub.secret);
console.log("To unsubscribe: id", sub.id, "token", sub.manageToken);
