# Propuesta individual

**Nombre:** Monserrat Mendoza

**Usuario de GitHub:** M0nsxx

---

## El problema

*(Borrador para que Monse lo revise y lo escriba con sus propias palabras;
el hub propone este ángulo porque es el que terminó complementando la
propuesta de Giovanny y llevó al pivote del equipo.)*

Un usuario de una app en Stellar no se entera a tiempo de lo que le pasa a
su dinero: si recibió un pago, o si el contrato donde lo tiene cambió, se
enteraría solo si entra a revisar manualmente.

## ¿Quién lo sufre?

Lo sufre el usuario final de cualquier app que mueve fondos en Stellar, que
depende de que la app le avise; y lo sufre también el equipo que construye
esa app, porque no existe un estándar para ese aviso y tiene que
construirlo desde cero.

## ¿Cómo se resuelve hoy y qué cuesta?

Cada app construye su propio sistema de monitoreo: un proceso que consulta
la red en ciclos, su propio bot, su propia cola de reintentos, casi siempre
sin firmar lo que manda. El costo es tiempo de desarrollo repetido en todo
el ecosistema, y avisos poco confiables (se pierden, se duplican, o se
pueden falsificar).

## ¿Por qué creo que blockchain podría aportar?

Porque varias partes que no se conocen entre sí —la app, su usuario y quien
construye el sistema de avisos— necesitan compartir una misma prueba de que
el usuario dio su consentimiento para ser monitoreado, sin que ninguna
tenga que confiar ciegamente en las otras. Una firma con la propia wallet
del usuario resuelve eso mejor que un formulario o una cuenta en un panel
de un tercero.
