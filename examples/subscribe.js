import { Keypair } from "@stellar/stellar-sdk";
import { Pullcord } from "@pullcord/notify";

const wallet = Keypair.fromSecret(process.env.TESTNET_SECRET); // in an app: the user's wallet
const pullcord = new Pullcord({ url: process.env.PULLCORD_URL });

const sub = await pullcord.subscribe({
  address: wallet.publicKey(),
  events: ["payment.received"],
  channel: process.argv[2] ? { webhook: process.argv[2] } : { telegram: true },
  signMessage: (message) => wallet.signMessage(message), // SEP-53 proof of ownership
});

if (sub.telegramLink) console.log("Open in Telegram:", sub.telegramLink);
console.log("Webhook secret:", sub.secret, "| unsubscribe:", sub.id, sub.manageToken);
