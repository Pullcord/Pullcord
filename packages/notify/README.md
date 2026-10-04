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
  address: "G...",
  appLabel: "mi-app",             // opcional, nombre de TU app, sin datos personales
  events: ["payment.received"],
  channel: { webhook: "https://tu-app.example/pullcord" }, // o { telegram: true }
  signMessage: (message) => wallet.signMessage(message),  // SEP-53, con la wallet del usuario
});
// sub.secret: secreto HMAC del webhook. sub.telegramLink: enlace para el bot.
// sub.manageToken: para leer o borrar la suscripción. Se muestran una sola vez.
```

Para una dirección G, el paquete pide un reto al servidor, la wallet lo firma
con SEP-53 y el servidor verifica la firma. El mensaje dice que la firma no
mueve fondos. Cada reto sirve una sola vez y vence en 10 minutos.
`signMessage` puede devolver bytes, base64, hex o un objeto con
`signedMessage`.

Las direcciones C no pueden firmar SEP-53: se aceptan solo en testnet, sin
`signMessage`, y la respuesta trae `ownershipProof: "none"` y un aviso.

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
