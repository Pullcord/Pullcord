# @pullcord/notify

Avísale a los usuarios de tu app cuando reciben un pago en Stellar, por webhook
firmado o por Telegram. Pullcord solo avisa: nunca firma ni mueve fondos.

No está publicado en npm todavía. Dentro de este repo se instala con
`npm install ./packages/notify`.

## Suscribirse

```js
import { Pullcord } from "@pullcord/notify";

const pullcord = new Pullcord({ url: process.env.PULLCORD_URL });

const sub = await pullcord.subscribe({
  address: "G...",                 // o C... (testnet)
  events: ["payment.received"],
  channel: { webhook: "https://tu-app.example/pullcord" }, // o { telegram: true }
});
// sub.secret: secreto HMAC del webhook. sub.telegramLink: enlace para el bot.
// sub.manageToken: para leer o borrar la suscripción. Se muestran una sola vez.
```

Ejemplo completo: [examples/subscribe.js](../../examples/subscribe.js).

## Verificar el webhook

Cada aviso llega con `Pullcord-Signature: t=<unix>,v1=<hex>`, donde
`v1 = HMAC-SHA256(secret, t + "." + body)`. Verifica sobre el cuerpo crudo:

```js
import { verify } from "@pullcord/notify";
if (!verify(req.headers, rawBody, secret)) return res.writeHead(401).end();
```

Se rechazan las firmas con más de 5 minutos de antigüedad. Receptor completo:
[examples/receiver.js](../../examples/receiver.js).

## Darse de baja

```js
await pullcord.unsubscribe(sub.id, sub.manageToken); // borra la URL o el chat ID
```

En Telegram, `/stop` borra todas las suscripciones del chat.
