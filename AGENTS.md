# AGENTS.md — reglas del proyecto Pullcord

Fuente única de las reglas que aplican en cualquier sesión y en cualquier
herramienta (Claude Code o Antigravity). `CLAUDE.md` la importa con
`@AGENTS.md`; no dupliques estas reglas ahí.

Este repo es **público**. Aquí solo van reglas y hechos del proyecto.

## Qué es Pullcord

Capa de notificaciones para cualquier app de Stellar. La app integra un
paquete chico y avisa a sus propios usuarios cuando reciben un pago, cuando un
contrato emite un evento o cuando cambia el código (wasm) o el admin de un
contrato. El usuario se suscribe con su wallet. Pullcord solo avisa: nunca
firma, nunca mueve fondos, nunca ejecuta nada por el usuario. Tampoco califica,
audita ni da consejo de inversión.

MVP (alcance ampliado el 2026-10-04; lo ya construido se conserva):
1. Fuentes de eventos, todas por `getEvents` de Stellar RPC:
   a) pagos recibidos en una dirección G o C, de cualquier activo (eventos
      `transfer` unificados de CAP-67, Protocol 23);
   b) eventos de un contrato específico, filtrados por topics;
   c) cambio de wasm o de admin de un contrato (lo lee el motor de solo
      lectura ya construido). Es una función genérica: no se publican lecturas
      de protocolos de terceros.
2. Canales: webhook firmado con HMAC y bot de Telegram para el usuario final.
   WhatsApp y email después.
3. Paquete `@pullcord/notify` con `subscribe({ address | contract, events, channel })`.
   Integrarlo toma menos de 10 minutos, con un ejemplo de 15 líneas. Sin
   publicar en npm hasta decidirlo.
4. Registro de suscripciones en Soroban (testnet): el usuario se suscribe
   firmando con su wallet (prueba de propiedad y de consentimiento) y se da de
   baja on-chain. Cero datos personales on-chain.
5. Cobro con x402: gratis hasta cierto volumen; el tier de agentes y de alto
   volumen se paga por llamada. Se usa un middleware estándar (`@x402/express`
   o el oficial que corresponda) y un facilitador existente: no se construye un
   facilitador y no se depende de ningún otro proyecto. El facilitador se
   acepta solo con evidencia de un pago liquidado, no con un reto 402. En el
   bootcamp, solo testnet. En mainnet, el cobro llega solo a una wallet propia
   de Pullcord; nada es custodial.

Datos personales (chat ID de Telegram, URL de webhook, email): viven fuera de
la cadena, el usuario puede borrarlos y el README lleva un aviso de
privacidad. Hosting: Fly.io, en una organización de Fly propia de Pullcord,
1 máquina siempre encendida con volumen; los secretos solo con `fly secrets set`.

## Reglas duras

**No custodial, siempre.** Pullcord nunca custodia fondos ni sostiene una llave
que pueda moverlos. El motor del MVP es de solo lectura.

**Solo avisa, nunca ejecuta.** Nada de auto-pagar, auto-retirar ni acciones
disparadas por un aviso. Ejecutar por el usuario reabre custodia.

**Nunca "SDK" ni "Developer" en el nombre, título o descripción pública.**
Nombra la capacidad, no la categoría técnica.

**Paquetes npm con el scope `@pullcord/*`.** El nombre `pullcord` sin scope
ya está tomado en npm.

**Nunca una calificación autoemitida presentada como auditoría.** Se reporta
metodología, hallazgos con su fuente, qué se arregló y qué queda fuera de
alcance.

**Todo hecho sobre Stellar se verifica con Raven antes de afirmarlo.** Lo que
no se pueda verificar se marca como inferencia, nunca como hecho.

**Cero alucinación.** Todo lo que depende de fecha (versiones, fechas de
upgrade de protocolo, precios, reglas de plataforma) se verifica en vivo, no
desde memoria de entrenamiento. Está permitido decir "no lo sé, hay que
verificarlo".

**Nunca decir "vivo", "listo", "en producción" o "cobrando" sin evidencia.**
Evidencia es un hash de transacción, una respuesta real de un endpoint o una
consulta al ledger, no el texto de un README.

**Nunca repetir un "mergeado", "desplegado" o "cerrado" sin verificarlo contra
la API primero, cada claim, no una muestra.**

**Para saber si un archivo existe en un repo de GitHub**, usa
`gh api repos/OWNER/REPO/git/trees/BRANCH?recursive=1` y busca la ruta exacta.
Nunca `contents/<path>` seguido de `grep -q .`: un 404 imprime `null` y eso
cuenta como verdadero.

**Ramas por variante.** Cuando un repo de dependencia tiene ramas por variante,
fija `?ref=` a la rama exacta que el proyecto usa. La rama default puede ser
otro código bajo el mismo path.

**Nunca digas que un archivo "ya existe en X"** sin haberlo escrito ahí de
verdad. Contenido que solo está en el chat no está en disco.

**Un secreto pegado en una sesión se trata como expuesto.** Rótalo o revócalo
antes de usarlo para algo con valor real.

**Trailer de coautoría de IA, visible, con el modelo real.** En cada commit y
en cada PR se incluye el trailer, nunca se oculta ni se quita. El modelo cambia
entre sesiones: usa el que produjo ese commit.
- Commits: `Co-Authored-By: <modelo real> <noreply@anthropic.com>` (ej. `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`)
- PRs: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

**Todo PR, issue o comentario público se escribe humanizado y sin
verbosidad.**

**Scope sprawl es el modo de fallo a evitar.** Antes de agregar algo, revisarlo
contra el MVP de arriba.

**Marca como inferencia lo que no se pueda verificar.** No lo presentes como
hecho confirmado.

## Público y privado

Va en el repo: decisiones de arquitectura y su razonamiento, evidencia de
pruebas (hashes, resultados), un `DEFERRED.md` si se crea (alcance diferido a propósito),
posicionamiento de tipo "qué es distinto y por qué".

Nunca va en el repo, vive en la memoria local (fuera de git): presupuestos,
estrategia de financiamiento, tácticas de referral o de embajadores, rechazos
o evaluaciones de otros proyectos, nombres de personas que no sean del equipo
publicado, comparativas de tipo "cómo le ganamos a X".

Sacar un dato sensible de un lugar público solo admite borrarlo o
generalizarlo. Nunca reemplazarlo por una causa inventada.

## Mapa del código

El código vive en WSL, nunca en `/mnt/c`. Ver `CLAUDE.md` para el mapa de
archivos y las skills.
