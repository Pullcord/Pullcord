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

Prueba de punta a punta en testnet: suscripción creada desde el frontend con
firma real de Freighter (SEP-53), pago recibido y aviso entregado.

- **Transacción:** [`ca6fcebe0260a8808c4cc9111effb9caaee52f0c6e6ff6d929727df6ca4259dc`](https://stellar.expert/explorer/testnet/tx/ca6fcebe0260a8808c4cc9111effb9caaee52f0c6e6ff6d929727df6ca4259dc)
  — verificada en Horizon testnet: `successful: true`, ledger `5147862`,
  `2026-10-11T23:54:57Z`. Pago de 10 XLM nativo de
  `GC7FWETCRCBY4UC4XNLE3WD5X25EPHUKRKUJZ2XHVBJN7RGHTHZDTJ5Y` a
  `GDLFNDFU2PN3ECGKHA5P2PDK46M7LE2HIXJ6YLWB4FF4EKYMUJUDJTPF`.
- **Aviso entregado:** webhook a webhook.site con cabecera
  `pullcord-signature` y `type: payment.received` para la suscripción
  `4cf38d12-a9e4-400b-b6b2-8f7707ccdafc` (dirección
  `GDLFNDFU2PN3ECGKHA5P2PDK46M7LE2HIXJ6YLWB4FF4EKYMUJUDJTPF`), con el mismo
  `txHash` y ledger verificados arriba. El cuerpo del webhook solo lleva el
  `subscriptionId` y la dirección pública; nunca el `secret` ni el
  `manageToken`.

Capturas:

1. [`1-inicio.png`](capturas/1-inicio.png) — pantalla de inicio en una
   ventana ancha. Muestra el bug de centrado: el contenido queda recargado a
   la derecha en vez de centrarse.
2. [`2-suscripcion-lista.png`](capturas/2-suscripcion-lista.png) — paso 4 del
   asistente, suscripción recién creada (`id`, `secret` del webhook y
   `manageToken` a la vista; esa suscripción ya se dio de baja, ver
   Bloqueos).
3. [`3-vista-previa-y-gestion.png`](capturas/3-vista-previa-y-gestion.png) —
   vista previa del formato del aviso (Telegram y webhook) y el formulario de
   gestión de una suscripción por `id` + `manageToken`.
4. [`4-estadisticas-en-vivo.png`](capturas/4-estadisticas-en-vivo.png) —
   contadores en vivo de `GET /v1/subscriptions/stats`: 1 app integrada, 2
   suscripciones, 1 aviso enviado.
5. [`5-aviso-recibido-webhook.png`](capturas/5-aviso-recibido-webhook.png) —
   el POST real recibido en webhook.site, con la cabecera
   `pullcord-signature` y el cuerpo del aviso (`txHash`, ledger, monto,
   origen y destino).

## 5. Bloqueos

- **Centrado en pantalla ancha** (ver captura 1): el contenido no se centra
  en viewports anchos. No se arregló a tiempo para esta entrega.
- La suscripción `8730acec-2c3f-4829-879b-e45905d795e9`, visible con su
  `secret` y `manageToken` en las capturas 2 y 3, ya se dio de baja antes de
  publicarlas (verificado: `DELETE` → 204, `GET` posterior → 404), así que
  ambos quedan inútiles. La suscripción `4cf38d12-a9e4-400b-b6b2-8f7707ccdafc`
  no muestra su `secret` ni su `manageToken` en ninguna captura, así que
  queda activa.
