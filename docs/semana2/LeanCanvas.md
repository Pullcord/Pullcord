# Lean Canvas: Pullcord

> Alcance vigente desde el 2026-10-04: capa de notificaciones para apps de Stellar.

**Problema**
- Cada app de Stellar reconstruye sus avisos (pagos recibidos, eventos,
  cambios de contrato): poller, reintentos, bot.
- No hay una forma estándar de que el usuario consienta que lo monitoreen.
- Los usuarios se enteran tarde de cambios de código o de admin en los
  contratos donde tienen fondos.

**Segmentos de cliente**
- Apps que avisan a sus usuarios: wallets, pagos y comercios, escrows, DeFi.
- Usuarios finales de esas apps (reciben el aviso, no pagan).
- Agentes de IA (pagan por uso con x402).

**Propuesta de valor única**
Avísale a tus usuarios de lo que pasa en Stellar con 15 líneas de código:
pagos recibidos, eventos de contrato y cambios de wasm o de admin, con
consentimiento firmado por su wallet. Solo avisa, nunca ejecuta.

**Solución**
1. Fuentes por `getEvents` (CAP-67): pagos recibidos en G o C de cualquier
   activo; eventos de un contrato; cambio de wasm o de admin.
2. Canales: webhook HMAC y Telegram. Email después.
3. Paquete `@pullcord/notify`: `subscribe({ address | contract, events, channel })`.
4. Registro de suscripciones en Soroban (testnet), con alta y baja firmadas
   por la wallet.
5. x402 para agentes y alto volumen.

**Canales**
- Integradores: wallets (Creit Tech, Stellar Wallets Kit), apps de pago,
  escrows (Trustless Work).
- Repo abierto y ejemplo de 15 líneas.
- Bootcamp TESH (5, 7 y 9 de oct) y Demo Day BAF (26-oct).
- Grants del primer año.

**Fuentes de ingreso**
- Gratis hasta cierto volumen (alcance, no ingreso).
- x402 por llamada para agentes y alto volumen (liquidado en testnet vía
  Rail402).
- Más adelante: plan con volumen y respuesta garantizada para integradores.
- Primer año: grants (Instaward, SCF Open).

**Estructura de costos**
- Hosting: Fly.io, una máquina siempre encendida con volumen.
- RPC pública de testnet en el bootcamp; RPC propia o de pago en mainnet
  (por cotizar).
- Tiempo del equipo.

**Métricas clave**
- Apps integradas
- Suscripciones activas
- Avisos entregados y latencia (ledger → aviso)
- Llamadas pagadas por x402

Metas: por definir.

**Ventaja injusta**
Por validar. Hoy: consentimiento firmado on-chain, motor de wasm/admin ya
construido y x402 ya liquidando en testnet.

**Alternativas**
SorobanHooks (panel para el desarrollador; alertas por Discord, Telegram o
webhook según su sitio; diferencia de forma: Pullcord es B2B2C con
consentimiento firmado y solo avisa), Blip (inactivo), Stellar Command
Insights (en desarrollo), Hypernative y OZ Monitor (lado protocolo u
operador), Soroban Hub. Ver el Problem Brief.
