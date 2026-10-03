# AGENTS.md — reglas del proyecto Pullcord

Fuente única de las reglas que aplican en cualquier sesión y en cualquier
herramienta (Claude Code o Antigravity). `CLAUDE.md` la importa con
`@AGENTS.md`; no dupliques estas reglas ahí.

Este repo es **público**. Aquí solo van reglas y hechos del proyecto.

## Qué es Pullcord

Mapa público de los poderes privilegiados de protocolos DeFi en Stellar: quién
es el admin de cada contrato, si es una sola llave o un multisig (y su umbral),
si el contrato se puede actualizar o pausar, si usa un executable externo, y
alertas cuando cambia el código (wasm) o el admin. Solo hechos, cada uno con
link a su fuente. Nunca una calificación, nunca una auditoría, nunca consejo de
inversión.

MVP:
1. Motor de lectura de solo lectura para DeFindex, Soroswap y Trustless Work,
   más los admins de los contratos de USDC y EURC.
2. Registro en Soroban (testnet) donde el protocolo declara sus roles, para
   comparar lo declarado contra lo que hay en la cadena.
3. Alertas por cambio de wasm o de admin.
4. API JSON para que otras apps lo muestren.
5. Cobro por consulta de la API con x402 (pago por llamada). Una parte de la
   API queda gratis para humanos e integradores básicos; la consulta para
   agentes y de alto volumen se paga. Se usa un middleware estándar (`@x402/express`
   o el oficial que corresponda) y un facilitador existente: no se construye un
   facilitador y no se depende de ningún otro proyecto. El
   facilitador se acepta solo con evidencia de un pago liquidado, no con un
   reto 402. En el bootcamp, solo testnet. En mainnet, el cobro llega solo a
   una wallet propia de Pullcord; nada es custodial.

## Reglas duras

**No custodial, siempre.** Pullcord nunca custodia fondos ni sostiene una llave
que pueda moverlos. El motor del MVP es de solo lectura.

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
