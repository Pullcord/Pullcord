# MVP funcional (Semana 4)

## Enlaces verificables

- **Repositorio:** https://github.com/Pullcord/Pullcord
- **Contrato propio (testnet):** [`CBAU7N2YV5PHA6LJHFUJKW6J5GFEJAGMYBQFOOEYVJJSQBWV6R7VZJAA`](https://stellar.expert/explorer/testnet/contract/CBAU7N2YV5PHA6LJHFUJKW6J5GFEJAGMYBQFOOEYVJJSQBWV6R7VZJAA) ([Stellar Lab](https://lab.stellar.org/r/testnet/contract/CBAU7N2YV5PHA6LJHFUJKW6J5GFEJAGMYBQFOOEYVJJSQBWV6R7VZJAA))
- **Transacciones en testnet** (todas exitosas, verificadas en Horizon el 18-oct-2026):
  - Despliegue, ledger 5263735: [`1f27fd26…09f`](https://stellar.expert/explorer/testnet/tx/1f27fd26794212358d2e8df895fa65d7a9e742980e188801681d1a04c1d0f09f)
  - `register` (consentimiento A), ledger 5263740: [`9366d289…96a`](https://stellar.expert/explorer/testnet/tx/9366d289367392cf62401518f522614feb23fc9d884fdd42d8d1c1c55f63596a)
  - `register` (consentimiento B), ledger 5263741: [`ae1743d6…4ad`](https://stellar.expert/explorer/testnet/tx/ae1743d6a03450d598a2a028cabc28d3b250bba78a4dc3f16fc146677594f4ad)
  - `revoke` (consentimiento A), ledger 5263745: [`3a2994a6…8c7`](https://stellar.expert/explorer/testnet/tx/3a2994a60a6cf73489e4711cc19fd6a91412541cb65ca8614405010b1b5aa8c7)
- **Video (máx. 3 min):** PENDIENTE: pegar aquí el enlace público de YouTube.
- **Producto en línea:** PENDIENTE: pegar aquí el enlace del front desplegado.

## Aprendizajes y ajustes priorizados

Ordenados por impacto y esfuerzo.

1. **Alto impacto, poco esfuerzo: la prueba de propiedad no podía ser solo
   una firma fuera de la cadena.** En la semana 3 las direcciones de contrato
   (C) entraban sin prueba. Ahora entran únicamente con un consentimiento
   vigente en el contrato, y retirarlo en la cadena borra la suscripción.
   Ya está hecho.
2. **Alto impacto, esfuerzo medio: el consentimiento tenía que poder
   retirarse y verificarse sin confiar en nosotros.** Por eso el contrato
   conserva el registro como "retirado" en lugar de borrarlo: cualquiera ve
   que se retiró y cuándo. Hecho.
3. **Medio impacto, poco esfuerzo: la referencia en la cadena es un hash,
   nunca un dato personal.** Sale de un valor de un solo uso que emite el
   servidor. Hecho.
4. **Medio impacto, esfuerzo medio: el servidor lee el contrato sin enviar
   transacciones.** Mantiene la regla de que Pullcord solo avisa. Hecho.
5. **Queda pendiente:** alojar la API en un servidor siempre encendido (hoy
   el front desplegado no la alcanza), publicar `@pullcord/notify` en npm y
   corregir el centrado del front en pantallas anchas.

Lo que más nos enseñó la semana: el contrato es pequeño (cuatro funciones) y
casi todo el trabajo estuvo en conectar bien las tres piezas: la firma de la
wallet, la lectura del registro y el borrado de los datos al retirar.

## Riesgos y pendientes

- **La API no está alojada en un servidor siempre encendido.** El front en
  línea funciona solo en modo demostración. Sin ese servidor, nadie puede
  suscribirse desde el sitio público. Hay un `fly.toml` listo; falta decidir
  el costo y desplegar.
- **El botón de firma en el front aún no se probó con una firma real de
  Freighter dentro del navegador.** El contrato y las transacciones sí se
  probaron en testnet, y la invocación que arma el front se simuló contra el
  contrato desplegado. Falta una prueba manual de punta a punta.
- **El camino de las direcciones C se probó con pruebas automáticas y con la
  lectura real del contrato, pero no con una cuenta de contrato real** que
  firme el registro.
- **Si el servicio de lectura de la red falla, no se bloquean los avisos.**
  Decidimos no silenciar alertas por una caída; el costo es que, durante una
  caída, un consentimiento retirado puede tardar en respetarse.
- **El registro vive solo en testnet.** No hay despliegue en mainnet ni
  auditoría del contrato.
- **Datos públicos y permanentes:** en la cadena quedan la dirección y un
  hash. No hay datos personales, pero un registro no se puede borrar. Si una
  ley de protección de datos exigiera borrarlo, la respuesta es que solo hay
  un hash. Falta revisarlo con un abogado.
- **El consentimiento prueba que el dueño de la dirección autorizó, no quién
  es esa persona.**
- **La detección usa el servicio RPC de Stellar**, con ventana de historial
  acotada. Una caída larga puede perder avisos.
- **Fuera de alcance esta semana:** alertas de cambios de protocolos,
  congelamientos y liquidaciones, y el paquete publicado en npm.

## Plan de validación con usuarios

**A quiénes.** Al usuario del Problem Brief: equipos que construyen apps o
wallets sobre Stellar y hoy escriben su propio sistema de avisos, y las
personas que usan esas apps y quieren decidir quién monitorea su cuenta. Meta
de la primera ronda: 8 equipos y 15 usuarios finales, de la comunidad del
bootcamp y de Stellar en español.

**Con qué métodos.**
- Entrevistas de 20 minutos con equipos: cómo avisan hoy, cuánto les cuesta
  mantenerlo y qué harían con un consentimiento verificable.
- Prueba guiada con el producto: cada persona se suscribe con su wallet en
  testnet, recibe un aviso de prueba y después retira el consentimiento.
  Medimos tiempo y puntos donde se traba.
- Métricas del propio servicio, sin datos personales: apps integradas,
  suscripciones y avisos entregados.

**Hipótesis y criterio.**
1. *Los equipos prefieren integrar un paquete antes que construir sus
   propios avisos.* Se cumple si al menos 3 de los 8 equipos integran el
   paquete o piden hacerlo en las dos semanas siguientes. Hasta el 9-oct solo
   había una app integrada (la demo propia), así que esta es la hipótesis
   más débil.
2. *Los usuarios entienden y valoran poder retirar el consentimiento.* Se
   cumple si 10 de 15 completan la suscripción y el retiro sin ayuda, y la
   mayoría dice que confiaría más en una app que lo ofrece.
3. *El consentimiento en la cadena añade confianza y no fricción.* Se cumple
   si menos de 3 de 15 abandonan en el paso de firma.

**Cómo decidimos.** Si falla la hipótesis 1, el producto se reduce al
contrato y su lectura, y se ofrece a los equipos que ya tienen su propio
sistema de avisos. Si fallan las 2 y 3, el consentimiento se queda como
opción y no como paso obligatorio.

## Lo construido esta semana

- **Contrato Soroban** [`contracts/consent-registry`](../../contracts/consent-registry): `register`, `revoke`, `get` e
  `is_active`. Cada alta o baja exige la firma del dueño de la dirección.
  8 pruebas unitarias.
- **API:** nueva referencia de consentimiento (`POST /v1/subscriptions/consent-ref`),
  lectura del contrato sin enviar transacciones, las direcciones C solo
  entran con consentimiento vigente, y un consentimiento retirado en la
  cadena borra la suscripción y sus datos antes de la siguiente entrega.
  35 pruebas automáticas del servidor.
- **Front:** panel para registrar el consentimiento al terminar de
  suscribirse y para retirarlo desde la página de gestión, con firma de
  Freighter. La firma no mueve fondos.
- **Cómo repetirlo:** los comandos están en el
  [README del contrato](../../contracts/consent-registry/README.md).

## Participación del equipo

- **Giovanny Amador** (`Eras256`): contrato, despliegue en testnet, lectura
  en el servidor, pruebas, y esta documentación, con Claude Code como par de
  programación.
- **Monserrat Mendoza** (`M0nsxx`): PENDIENTE: completar con su trabajo de
  esta semana (prueba del panel de consentimiento con Freighter y ajustes
  del front).
