# Pullcord — Semana 3

## 1. Resumen

Esta semana se integró el frontend (`frontend/`) con la API ya existente y se
corrigió un bug de arranque en Windows en [src/server.js](../../src/server.js).
El flujo completo —conectar Freighter, elegir canal, firmar con SEP-53 y
confirmar la suscripción— corre de punta a punta en testnet.

## 2. Arquitectura

- **API** ([src/](../../src/)): motor de lectura de solo lectura sobre Stellar
  RPC, rutas de suscripción (`/v1/subscriptions`), watcher de pagos y entrega
  por webhook firmado (HMAC-SHA256) o Telegram. Detalle en
  [docs/PROYECTO.md](../PROYECTO.md).
- **Frontend** ([frontend/](../../frontend)): Vite, React, TypeScript y
  Tailwind. Asistente de suscripción de cuatro pasos (Freighter, canal, firma
  SEP-53, confirmación), vista previa del aviso, gestión de la suscripción y
  contadores en vivo desde `GET /v1/subscriptions/stats`. Detalle en
  [frontend/README.md](../../frontend/README.md).
- El servidor de desarrollo del frontend reenvía `/v1` y `/healthz` hacia la
  API (`:8080`), sin necesidad de CORS.

## 3. Participación

- **Monse:** Construí el frontend de Pullcord en frontend/ (Vite, React,
  TypeScript, Tailwind): marca y logo en SVG, paleta con modo oscuro y claro,
  hero con cuerda y letrero LED, asistente de 4 pasos (Freighter, canal, firma
  SEP-53 y confirmación) integrado con la API, vista previa del aviso,
  gestión de suscripción y contadores en vivo. Trabajé con Claude Code como
  par de programación.
- **Giovanny:** Corregí el arranque de la API en Windows (`import.meta.url`
  no coincidía con la comparación anterior) y validé el flujo completo con
  Freighter en testnet. Integré el frontend de Monse a `main` y armé esta
  documentación, con Claude Code como par de programación.

## 4. Evidencia

Pendiente: capturas del flujo con Freighter y hash de la transacción de
prueba en testnet, verificado contra Stellar RPC.
