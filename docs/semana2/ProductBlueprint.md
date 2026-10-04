# Product Blueprint

**Nombre del proyecto:** Pullcord

**Repositorio (enlace obligatorio):** [Pullcord/Pullcord](https://github.com/Pullcord/Pullcord)

---

## Contenido

1. Priorización de historias
2. Propuesta de valor
3. Flujo de usuario
4. Alcance del MVP
5. Lean Canvas
6. Backlog priorizado (Kanban)
7. Arquitectura inicial
8. Uso de Stellar y justificación

---

## 1. Priorización de historias

**Criterio de priorización:** imprescindible / debería / podría / queda
fuera, medido contra el mínimo usable del 7-oct (suscribirse con firma de
wallet, recibir un pago real y que llegue el aviso por webhook o Telegram)
y el criterio del 9-oct (3 o más apps integradas).

| Prioridad | Historia | Propuesta por | Por qué entra al backlog |
| :---: | --- | :---: | --- |
| 1 | Como usuario de DeFi, quiero que nadie pueda suscribir mi cuenta sin mi consentimiento firmado. | Giovanny | Imprescindible: sin esto no hay producto defendible, solo un monitor más. |
| 2 | Como desarrollador de una app, quiero verificar la firma de cada aviso que recibo por webhook. | Giovanny | Imprescindible: condición de seguridad, no una mejora (evita avisos falsificados). |
| 3 | Como usuario de DeFi, quiero recibir un aviso en Telegram o webhook cuando mi cuenta recibe un pago. | Giovanny / Monse | Imprescindible: es el caso de uso que se demuestra completo el 7-oct. |
| 4 | Como desarrollador de una app, quiero integrar los avisos con un paquete chico y un ejemplo corto. | Giovanny | Imprescindible: si tomar más de 10 minutos, ningún equipo lo adopta en el bootcamp. |
| 5 | Como protocolo que integra Pullcord, quiero declarar un nombre corto de mi app al suscribirme. | Monse | Debería: es como se mide el criterio de 3+ apps del 9-oct, sin exponer datos de sus usuarios. |
| 6 | Como protocolo que integra Pullcord, quiero que me avisen si cambia el admin o el wasm de un contrato. | Giovanny | Debería: el motor ya lo lee; falta conectarlo a una suscripción. Para el 9-oct. |
| 7 | Como agente de IA, quiero pagar por consulta de alto volumen con x402. | Giovanny | Podría: x402 ya liquida en testnet, pero no es lo que se demuestra en el Demo Day. |
| 8 | Como agente de IA, quiero suscribirme a eventos de un contrato específico. | Monse | Queda fuera del 9-oct: depende de que primero esté sólido el flujo de pagos. |

*(Las historias completas y su orden individual están en
[GiovannyAmador.md](GiovannyAmador.md) y [MonserratMendoza.md](MonserratMendoza.md).)*

---

## 2. Propuesta de valor

**Usuario (del Problem Brief):** apps de Stellar que necesitan avisar a sus
usuarios (wallets, pagos, escrows, DeFi), y los usuarios finales de esas
apps.

**Resultado que obtiene:** la app integra avisos confiables (pagos
recibidos, eventos de contrato, cambios de wasm o de admin) en minutos, sin
construir su propio sistema de monitoreo; el usuario final recibe el aviso
en el canal que ya usa (Telegram o un webhook), con la certeza de que nadie
pudo suscribir su cuenta sin su firma.

**Por qué elegiría esta solución:** porque integrar un paquete abierto toma
menos tiempo que construir y mantener un poller, una cola de reintentos y
un bot propios, y porque el consentimiento verificable es algo que
construir internamente requeriría diseñar desde cero.

**En qué se diferencia de cómo lo resuelve hoy:** hoy cada equipo construye
su propio sistema, sin firma en los webhooks y sin probar el consentimiento
del usuario monitoreado. Pullcord separa esas dos responsabilidades
(consentimiento y entrega) en un componente reusable, de código abierto, que
nunca ejecuta nada por el usuario.

---

## 3. Flujo de usuario

| Paso | Rol | Qué hace | Punto de interacción |
| :---: | :---: | --- | --- |
| 1 | Desarrollador de la app | Integra `@pullcord/notify` y llama a `subscribe()` con la dirección del usuario. | Código de la app (paquete npm) |
| 2 | Usuario final | Firma un reto de un solo uso con su wallet (SEP-53), que dice explícitamente que no mueve fondos. | Wallet (Freighter u otra) |
| 3 | Servidor de Pullcord | Verifica la firma, crea la suscripción y, si el canal es Telegram, entrega un enlace para vincular el chat. | API de Pullcord |
| 4 | Usuario final | Abre el enlace de Telegram (si eligió ese canal) o deja su webhook ya configurado. | Telegram / su propio servidor |
| 5 | Cualquiera | Envía un pago real en Stellar a la dirección suscrita. | Red de Stellar (testnet) |
| 6 | Vigilante (`watcher`) de Pullcord | Detecta el evento `transfer` (CAP-67) vía `getEvents` y lo cruza contra las suscripciones activas. | Stellar RPC |
| 7 | Servidor de Pullcord | Entrega el aviso firmado (webhook) o lo manda por Telegram. | Webhook del receptor / bot de Telegram |
| 8 | Usuario final | Ve el aviso con el monto, el origen y el enlace a la transacción. | Telegram / la app receptora |

---

## 4. Alcance del MVP

| Dentro del MVP (funcionalidad central) | Fuera del MVP (deseable, para después) |
| --- | --- |
| Avisos de pagos recibidos en direcciones G o C, cualquier activo (CAP-67). | Suscripción a eventos de un contrato específico. |
| Consentimiento verificado con SEP-53 para direcciones G. | Registro de consentimiento on-chain en Soroban (direcciones C, y como alternativa más fuerte para G). |
| Canales: webhook firmado con HMAC y bot de Telegram. | Canal de email y WhatsApp. |
| Paquete `@pullcord/notify` y ejemplo de 15 líneas. | Publicación del paquete en npm. |
| Entrega resistente a SSRF (resolución de DNS en cada envío, sin seguir redirects). | — (esto ya es parte del mínimo seguro, no se recorta). |
| Conteo agregado de apps integradas (`appLabel` + `/subscriptions/stats`). | Cobro con x402 activado en el tier de agentes (el middleware ya funciona en testnet, falta conectarlo a esta API). |
| Aviso de cambio de wasm o de admin como lectura (motor ya construido). | Ese aviso conectado a una suscripción del usuario. |

**Por qué el recorte sigue entregando valor:** con pagos recibidos,
consentimiento firmado y entrega segura, una app ya puede reemplazar por
completo su propio sistema de monitoreo de pagos, que es la necesidad más
común y la que se puede demostrar de principio a fin para el Demo Day. Lo
que queda fuera (eventos de contrato, registro on-chain, más canales)
amplía la cobertura pero no cambia si el producto ya es útil hoy.

---

## 5. Lean Canvas

**Enlace al Lean Canvas (obligatorio):** [Lean Canvas del proyecto](LeanCanvas.md)

---

## 6. Backlog priorizado (Kanban)

**Enlace al tablero (obligatorio):** [Tablero Kanban en GitHub Projects](https://github.com/orgs/Pullcord/projects/1/views/1)

---

## 7. Arquitectura inicial

**Diagrama (imagen o enlace):** pendiente de imagen; la tabla de abajo
describe las mismas capas.

| Capa | Componente | Qué hace |
| :---: | --- | --- |
| Interfaz | Paquete `@pullcord/notify` (cliente sin dependencias) y el bot de Telegram | Es lo que integra la app y lo que ve el usuario final. |
| Lógica | API Express (`src/notify/routes.js`), vigilante con cursor persistente (`src/notify/watcher.js`), entrega con HMAC y protección SSRF (`src/notify/dispatch.js`, `src/notify/ssrf.js`), SQLite para suscripciones (`src/notify/store.js`) | Verifica el consentimiento, detecta los eventos, entrega los avisos y guarda solo lo necesario fuera de la cadena. |
| Stellar | Stellar RPC (`getEvents`, eventos `transfer` unificados por CAP-67) y el SDK de Stellar (`Keypair.verifyMessage`, SEP-53) | Es la fuente de verdad de los pagos y la prueba criptográfica de que el usuario controla su dirección. |

**En qué punto entra la red:** en dos momentos distintos: cuando el
usuario firma el reto con su wallet (prueba de consentimiento, sin tocar la
red) y cuando el vigilante consulta `getEvents` en Stellar RPC para
detectar el pago real. La entrega del aviso (webhook, Telegram) ocurre
fuera de la red, en la infraestructura de Pullcord (Fly.io).

---

## 8. Uso de Stellar y justificación

**Criterio de pertinencia (del Problem Brief):** varias partes que no se
conocen entre sí necesitan compartir una misma prueba de consentimiento, y
se elimina un intermediario centralizado que de otra forma decidiría quién
puede monitorear a quién.

| Componente de Stellar | Para qué lo usamos | Por qué ese y no otra alternativa |
| --- | --- | --- |
| Stellar RPC `getEvents` (eventos `transfer`, unificados por CAP-67 desde Protocol 23) | Única fuente para detectar pagos recibidos, en direcciones G y C, de cualquier activo. | Antes de CAP-67 había que combinar Horizon (para G) y RPC (para C) con formatos distintos; ahora una sola fuente cubre ambos. Verificado en testnet: evento `transfer` real para un pago entre cuentas G (tx `91b505d9…`, ledger 5024205). |
| SEP-53 (`signMessage` / `verifyMessage`, vía `@stellar/stellar-sdk` y Freighter) | Prueba de que el usuario controla la dirección que se suscribe, sin mover fondos. | Es el estándar de Stellar para esto; la alternativa (un formulario o una cuenta en un panel propio) no prueba la propiedad de la clave, solo la buena fe del formulario. |
| Registro de suscripciones en Soroban (próximo, testnet) | Alta y baja de suscripciones on-chain, firmadas por la wallet, sin datos personales en la cadena. | Permite que la revocación del consentimiento sea verificable por cualquiera, no solo confiable porque Pullcord diga que la procesó. |
| x402 (middleware `@x402/express`, facilitador Rail402 en testnet) | Cobro por consulta para agentes de IA y alto volumen. | Evita pedirle a un agente que tenga una cuenta o una tarjeta; el pago liquidado ya se verificó en testnet (tx `6a039644…`, ledger 5006550). |
