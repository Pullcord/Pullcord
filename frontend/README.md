# Frontend de Pullcord

Página para suscribir una dirección de Stellar a avisos de pago. Vite, React, TypeScript y Tailwind. Solo testnet.

## Correrlo

1. En la raíz del repo: `npm install` y `npm start`. La API queda en `:8080`.
   Telegram necesita `PULLCORD_TELEGRAM_BOT_TOKEN`. Sin él, prueba con un webhook de https://webhook.site.
2. En `frontend/`: `npm install` y `npm run dev`. La página queda en http://localhost:3000.
3. Instala [Freighter](https://www.freighter.app/), ponla en Testnet y fondea tu cuenta con Friendbot.

El servidor de desarrollo reenvía `/v1` y `/healthz` hacia `http://localhost:8080`, así no hace falta CORS.

## Build

`npm run build` genera `frontend/dist/`. Express puede servir esa carpeta.

## Qué hay

- Hero con cuerda que se jala (arrastre, teclado o toque) y letrero LED.
- Asistente de cuatro pasos: wallet, canal, firma SEP-53 y confirmación.
- Vista previa del aviso (Telegram y webhook), con el formato de `src/notify/`.
- Gestión de una suscripción con ID y `manageToken`.
- Contadores en vivo desde `GET /v1/subscriptions/stats`.

## Seguridad

- Solo se firma con Freighter. Nunca se pide una llave secreta.
- `secret` y `manageToken` viven solo en memoria mientras la pantalla está abierta. No se guardan en `localStorage` ni en ningún otro lado.
- Lo único que se recuerda en el navegador es el tema (`pullcord-theme`).
