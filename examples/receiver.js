// Minimal webhook receiver: verifies the Pullcord signature over the raw body.
import { createServer } from "node:http";
import { verify } from "@pullcord/notify";

const secret = process.env.PULLCORD_WEBHOOK_SECRET;

createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!verify(req.headers, raw, secret)) return res.writeHead(401).end();
  const event = JSON.parse(raw);
  console.log(`${event.type}: ${event.payment.amountDecimal ?? event.payment.amount} ${event.payment.asset ?? ""} from ${event.payment.from} (tx ${event.txHash})`);
  res.writeHead(200).end();
}).listen(process.env.PORT || 3000);
