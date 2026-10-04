# Pullcord

Capa de notificaciones para apps de Stellar. Tu app integra un paquete chico y
avisa a sus usuarios cuando reciben un pago, por webhook firmado o por
Telegram. Pullcord solo avisa: nunca firma, nunca mueve fondos, nunca ejecuta
nada por el usuario.

**Estado:** early, solo testnet. Nada desplegado todavía.

## Qué funciona hoy

- Pagos recibidos en una dirección G o C, de cualquier activo. Se leen los
  eventos `transfer` de Stellar RPC (`getEvents`), que desde Protocol 23
  (CAP-67) incluyen también los pagos clásicos.
- Webhook firmado con HMAC-SHA256 y bot de Telegram.
- Prueba de propiedad: suscribir una dirección G requiere que su wallet firme
  un reto de un solo uso con SEP-53 (`signMessage`); el servidor verifica la
  firma. Las direcciones C no pueden firmar SEP-53: por ahora se aceptan **solo
  en testnet** y la API las marca `ownershipProof: "none"` con un aviso.
- Paquete [`@pullcord/notify`](packages/notify) (sin publicar en npm) y un
  [ejemplo de 15 líneas](examples/subscribe.js).

Prueba en testnet del 2026-10-04: avisos con firma verificada de pagos USDC y
XLM a `GDBXA45U…DOBH`, por ejemplo la tx
`caa78ef1f1090ff7cd8eb30d2d2b3a67df7f088a421a993ce907a0ddb7f425c4`
(ledger 5024721, `SUCCESS` en RPC).

## Correrlo

```sh
npm install
PULLCORD_TELEGRAM_BOT_TOKEN=... npm start   # el token es opcional; sin él no hay Telegram
TESTNET_SECRET=S... PULLCORD_URL=http://localhost:8080 node examples/subscribe.js https://tu-app.example/hook
```

Variables: ver [src/config.js](src/config.js). La base de suscripciones es un
archivo SQLite (`PULLCORD_DB_PATH`, por defecto `pullcord.db`).

## Desplegar (Fly.io)

[fly.toml](fly.toml) define una sola máquina siempre encendida (el watcher
escucha todo el tiempo), un volumen en `/data` para la base SQLite y Node
22.23.2 fijo en el [Dockerfile](Dockerfile). No escales a más de una máquina:
cada una tendría su propio volumen y sus propias suscripciones.

```sh
fly orgs create pullcord                       # org propia de Pullcord
fly apps create pullcord-notify --org <slug-de-la-org>   # el slug que imprime el paso anterior
fly volumes create pullcord_data --app pullcord-notify --region dfw --size 1
fly secrets set --stage --app pullcord-notify PULLCORD_TELEGRAM_BOT_TOKEN=...   # en tu terminal; --stage no despliega
fly deploy --app pullcord-notify
```

Los secretos van solo con `fly secrets set`. `fly.toml` no lleva ninguno.

## Privacidad

- **Qué se guarda:** la dirección suscrita, los eventos elegidos y el canal: la
  URL del webhook o el chat ID de Telegram. Nada más. El chat ID y la URL nunca
  se escriben en la cadena.
- **Para qué:** solo para enviar el aviso.
- **Cómo borrarlo:** `unsubscribe(id, manageToken)` o `/stop` en el bot. Se
  borran la suscripción, la URL o el chat ID y el registro de entregas.
- Las direcciones y los pagos de Stellar son públicos; Pullcord no agrega datos
  personales a la cadena.

## Seguridad de los webhooks

Antes de cada envío se resuelve el DNS del host y se rechaza si cualquiera de
sus direcciones es privada, loopback, link-local, de metadata de nube,
multicast o reservada (IPv4 e IPv6, incluidas las IPv4 embebidas en IPv6). La
conexión va a la misma dirección que pasó el chequeo, así que un cambio de DNS
entre el chequeo y la conexión no sirve. Los redirects no se siguen. Ver
[src/notify/ssrf.js](src/notify/ssrf.js).

## Límites conocidos

- Direcciones C: sin prueba de propiedad hasta el registro de consentimiento en
  Soroban. Solo testnet.
- `node:sqlite` es experimental en Node 22.

**Licencia:** Apache License 2.0, ver [LICENSE](LICENSE). Copyright 2026 los autores de Pullcord.
