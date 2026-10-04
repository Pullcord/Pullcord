# Problem Brief

## Decisión del problema

### Problema elegido

Toda app de Stellar reconstruye su propio sistema de avisos a sus usuarios
(pagos recibidos, eventos de contrato, cambios en los contratos donde tienen
fondos), sin ningún estándar y sin una forma verificable de que el usuario dio
su consentimiento para ser monitoreado. Propuesto por Giovanny Amador
(`Eras256`), a partir de un hallazgo técnico nuevo que simplificaba el
problema (ver "Cómo tomamos la decisión").

### Por qué elegimos este

Tres criterios de la Sesión 1 se cumplen a la vez: varias partes que no se
conocen (la app, su usuario, Pullcord) necesitan compartir un mismo
mecanismo de consentimiento; el histórico de pagos ya es público e
inalterable en Stellar, así que construir sobre él no agrega un registro
nuevo, lo aprovecha; y se elimina un intermediario que hoy concentraría la
confianza (ninguna empresa decide quién puede "escuchar" la cuenta de un
usuario; lo decide la firma de su propia wallet). Además, el problema no
depende de que un solo protocolo externo coopere: cualquier app de Stellar
lo necesita, no solo los socios con los que estábamos negociando.

### Propuestas descartadas

| Propuesta | Quién la propuso | Motivo del descarte |
| --- | --- | --- |
| Mapa público de los poderes privilegiados de protocolos de DeFi en Stellar (quién es admin, multisig o llave única, si el contrato se puede pausar o actualizar) | Giovanny Amador | Dependía de que un protocolo confirmara su participación como socio principal antes de poder usar sus datos en público; esa confirmación no llegó a tiempo. El equipo fijó una regla de salida: si ningún socio decía que sí para el 10-oct, el proyecto cambiaba. Se adelantó la decisión al 4-oct al encontrar una alternativa que no depende de ningún socio. |

### Cómo tomamos la decisión

El equipo venía documentando el silencio del socio y ya tenía fijada una
regla de salida (10-oct). El 4-oct, al verificar con el hub que Stellar
Protocol 23 (CAP-67, "Unified Asset Events") hace que los pagos clásicos
entre cuentas también emitan eventos `transfer`, igual que los pagos entre
contratos, Giovanny identificó que el problema de avisos era más general,
más fácil de construir bien una sola vez, y no dependía de ningún socio.
El equipo decidió el pivote por consenso, conservando el nombre, el repo y
el motor de lectura ya construido (que ahora sirve para un propósito
distinto: avisar cuando cambia el admin o el código de un contrato).

---

## Problem Brief

### Encabezado

**Pullcord** — toda app de Stellar reconstruye su propio sistema de avisos a
sus usuarios; Pullcord lo resuelve una vez, con consentimiento verificable
firmado por la wallet del usuario.

### Equipo y roles

| Integrante | GitHub | Rol |
| --- | --- | --- |
| Giovanny Amador | [`Eras256`](https://github.com/Eras256) | Producto e ingeniería; responsable de las entregas del bootcamp |
| Monserrat Mendoza | [`M0nsxx`](https://github.com/M0nsxx) | *(a confirmar por Monse — diseño de producto / investigación, según se repartan en la siguiente sesión del equipo)* |

Coordinación interna: canal directo del equipo (fuera de este repo).
Bootcamp: BAF "Blockchain Builders 101". Demo Day: 26-oct-2026.

### Problema y evidencia

Cada app que corre sobre Stellar —una wallet, un cobro, un escrow, un
protocolo de DeFi— necesita avisarle a su usuario cuando algo le pasa: que
recibió un pago, que un contrato emitió un evento, que el contrato donde
tiene fondos cambió de código o de administrador. Hoy cada equipo construye
su propio poller contra RPC o Horizon, su propia cola de reintentos y su
propio bot, desde cero y sin ningún estándar compartido. Es trabajo
repetido en todo el ecosistema y fácil de hacer mal: eventos perdidos al
reiniciar el servicio, avisos duplicados, webhooks sin firma que cualquiera
puede falsificar.

Verificamos con el hub que no existe hoy un producto vivo que resuelva esto
del lado de la app que integra (B2B2C). Encontramos **SorobanHooks**
(financiado en las rondas 33 y 37 del SCF, $55,000), cuyo sitio anuncia
alertas de wallet, de activo y de eventos de contrato por Discord, Telegram
o webhook, y se presenta como "Live on Testnet". Es un panel donde el
**desarrollador** se crea una cuenta y recibe avisos de lo suyo; no
encontramos evidencia de que permita avisar a los usuarios finales de una
app externa, ni de que pida consentimiento firmado del usuario monitoreado.
Además, el mismo sitio promueve ahora "Aptopia Wallet", que sí ejecuta
operaciones (trading automatizado) por el usuario — justo lo que Pullcord
descarta por regla.

La necesidad de que estos poderes y eventos sean "observables" también la
señala la Fundación Stellar: su documento de estándares de seguridad DeFi
(20-jul-2026) pide "documentación pública de cada rol privilegiado... que el
poder sea observable". El incidente del pool Comet BLND-USDC (25-ago-2026,
717,518 USDC extraídos, post-mortem de Script3 el 28-ago) muestra el costo
de enterarse tarde.

### Usuario y actores

- **Apps que integran Pullcord:** wallets, apps de pago, escrows (p. ej.
  Trustless Work), protocolos de DeFi. Hoy resuelven esto construyendo su
  propio sistema de monitoreo, con el costo de tiempo de desarrollo que eso
  implica y el riesgo de hacerlo mal.
- **Usuarios finales de esas apps:** reciben el aviso; no escriben código ni
  pagan directamente a Pullcord.
- **Agentes de IA:** consultan y se suscriben de forma automatizada; pagan
  por uso con x402 cuando el volumen supera el nivel gratuito.
- **Stellar RPC:** la fuente de los eventos (`getEvents`), pública y ya
  operada por la red, no por Pullcord.

### Flujo actual de valor

1. Un equipo decide que su app necesita avisar pagos recibidos a sus
   usuarios.
2. Escribe su propio proceso que consulta Horizon o RPC en un ciclo
   (`polling`), normalmente sin manejar bien los reinicios.
3. Construye su propia cola de reintentos para el canal de salida (email,
   push, webhook), casi siempre sin firmar el mensaje.
4. Si quiere Telegram, integra la API de Telegram por su cuenta.
5. Si un usuario quiere dejar de recibir avisos, el equipo necesita construir
   también el flujo de baja y borrar los datos a mano.
6. Ningún paso de este flujo pide ni verifica el consentimiento de la
   persona cuya cuenta se está observando.

No hay una obligación normativa explícita en ningún paso; es trabajo de
ingeniería repetido, no un requisito legal.

### Fricciones identificadas

- **Paso 2:** sin un cursor persistente, un reinicio del servicio pierde
  eventos o los repite. RPC solo retiene eventos unos 7 días.
- **Paso 3:** sin firma criptográfica en el webhook, cualquiera que adivine
  la URL puede mandar avisos falsos a la app receptora.
- **Paso 4:** cada equipo reimplementa el mismo bot de Telegram.
- **Paso 5:** sin un proceso estándar de baja, los datos personales (chat
  ID, URL de webhook) quedan guardados indefinidamente.
- **Transversal:** nadie prueba que el usuario monitoreado dio su
  consentimiento; cualquiera puede suscribir la cuenta de otra persona.

### Oportunidad e hipótesis

La oportunidad priorizada es la fricción transversal: construir, una sola
vez y bien, un mecanismo de consentimiento verificable y una entrega
confiable (sin perder ni duplicar eventos), para que ninguna app tenga que
resolver esto por su cuenta. Elegimos esta sobre las demás porque es la que
un solo equipo puede resolver sin depender de qué protocolo específico
integre cada app.

**Hipótesis:** si el consentimiento se prueba con la firma de la propia
wallet del usuario (en vez de con un formulario o una cuenta en un panel de
terceros), y la entrega se basa en una sola fuente de eventos ya unificada
por el protocolo (CAP-67), un equipo puede integrar avisos confiables en
minutos en lugar de construir su propio sistema de monitoreo.

### Criterio de pertinencia

El caso cumple con dos de los criterios de la Sesión 1. Primero, varias
partes que no se conocen entre sí —la app, su usuario, y Pullcord como
intermediario del aviso— necesitan compartir una misma prueba de
consentimiento sin que ninguna tenga que confiar en la palabra de las
otras; eso es exactamente lo que resuelve una firma verificable con la
wallet del usuario (SEP-53 hoy; un registro en Soroban para la baja
on-chain, después). Segundo, se elimina un intermediario que hoy
concentraría la confianza: sin esto, sería la propia empresa que construye
el sistema de avisos quien decide unilateralmente a quién puede monitorear,
sin que el usuario pueda verificarlo ni revocarlo de forma independiente.

Aclaración honesta: los eventos de pago en sí ya son públicos en Stellar;
el registro distribuido no es necesario para "guardar" el pago, sino para
la prueba de consentimiento y su revocación, que es la parte del flujo que
hoy no tiene ningún estándar verificable.

### Supuestos y riesgos

- **Supuesto:** las apps prefieren integrar un paquete abierto en minutos
  en vez de construir su propio sistema de monitoreo. Riesgo si es falso:
  equipos grandes ya tienen su propia infraestructura y no ven el ahorro.
- **Supuesto:** la ventana de retención de RPC (~7 días) más un cursor
  persistente basta para no perder eventos en operación normal. Riesgo:
  una caída más larga sí pierde eventos; no hay replay más allá de la
  retención de RPC.
- **Supuesto:** un competidor con forma distinta (como SorobanHooks, que
  apunta al panel del desarrollador, no al B2B2C) no cambia de enfoque
  antes del Demo Day. Esto no se puede verificar hoy, se marca como
  inferencia.
