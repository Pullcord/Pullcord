# Pullcord

Capa de notificaciones para apps de Stellar. Tu app integra un paquete chico y
avisa a sus usuarios cuando reciben un pago, por webhook firmado o por
Telegram. Pullcord solo avisa: nunca firma, nunca mueve fondos, nunca ejecuta
nada por el usuario.

Más contexto del proyecto en [docs/PROYECTO.md](docs/PROYECTO.md).

## Requisitos

- Node.js 22
- [Freighter](https://www.freighter.app/) en Testnet, con la cuenta fondeada
  por [Friendbot](https://friendbot.stellar.org) (solo para probar el
  frontend)

## Instalación

```sh
npm install
cd frontend && npm install
```

## Cómo correrlo

1. En la raíz del repo:

   ```sh
   PULLCORD_TELEGRAM_BOT_TOKEN=... npm start   # el token es opcional; sin él no hay Telegram
   ```

   La API queda en `http://localhost:8080`. Variables: ver
   [src/config.js](src/config.js). La base de suscripciones es un archivo
   SQLite (`PULLCORD_DB_PATH`, por defecto `pullcord.db`).

2. En `frontend/`:

   ```sh
   npm run dev
   ```

   La página queda en http://localhost:3000 y reenvía `/v1` y `/healthz`
   hacia `:8080` (sin necesidad de CORS).

3. Para probar sin Telegram, suscribe un webhook con
   [webhook.site](https://webhook.site).
