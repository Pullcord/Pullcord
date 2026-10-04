# Historias de usuario individuales

**Nombre:** Monserrat Mendoza

**Usuario de GitHub:** M0nsxx

---

*(Borrador para que Monse lo revise y ajuste con su propia perspectiva.)*

## Mis historias de usuario

1. Como **usuario de DeFi**, quiero elegir si me avisan por Telegram o por
   webhook, para usar el canal que ya reviso en mi día a día.
2. Como **usuario de DeFi**, quiero que el mensaje del aviso diga
   claramente que no autoriza ningún movimiento de fondos, para no
   confundirlo con una solicitud de aprobar una transacción.
3. Como **desarrollador de una app**, quiero una guía corta en español con
   un ejemplo real de cómo firmar con Freighter, para integrar sin tener
   que leer el estándar SEP-53 completo.
4. Como **protocolo que integra Pullcord**, quiero poder declarar un nombre
   corto de mi app al suscribirme, para que se me pueda contar como
   integración sin exponer datos de mis usuarios.
5. Como **agente de IA**, quiero poder suscribirme a eventos de un contrato
   específico, además de a pagos, para monitorear condiciones más
   específicas que mi protocolo necesita vigilar.
6. Como **usuario de DeFi**, quiero que mis datos personales (chat ID,
   URL de webhook) nunca queden escritos en la cadena, para que mi
   privacidad no dependa de cómo se construya el producto.

## La más importante y por qué

| Orden de importancia | Historia # | Por qué |
| :---: | :---: | --- |
| 1 (la más importante) | 2 | Es la frontera que evita que Pullcord se confunda con un producto que ejecuta operaciones; sin este mensaje claro, se pierde la regla de "solo avisa". |
| 2 | 6 | Es una promesa de privacidad que no se puede violar ni por accidente; tiene que estar desde el diseño, no agregarse después. |
| 3 | 3 | Sin una guía clara, ningún equipo del bootcamp va a lograr integrarlo a tiempo para el 9-oct. |
| 4 | 1 | Dar a elegir el canal es parte del mínimo usable del 7-oct. |
| 5 | 4 | Hace falta para medir cuántos equipos integran de verdad, el criterio del 9-oct. |
| 6 (la menos importante) | 5 | Es valioso, pero depende de que primero funcione bien el flujo de pagos; queda para después del 9-oct. |
