# Historias de usuario individuales

**Nombre:** Giovanny Amador

**Usuario de GitHub:** Eras256

---

## Mis historias de usuario

1. Como **usuario de DeFi**, quiero recibir un aviso en Telegram cuando mi
   cuenta recibe un pago, para no tener que revisar el explorador a cada
   rato.
2. Como **desarrollador de una app**, quiero integrar los avisos con un
   paquete chico y un ejemplo corto, para no construir mi propio sistema de
   monitoreo.
3. Como **desarrollador de una app**, quiero verificar la firma de cada
   aviso que recibo por webhook, para confiar en que viene de Pullcord y no
   de alguien que adivinó mi URL.
4. Como **usuario de DeFi**, quiero que nadie pueda suscribir mi cuenta a
   avisos sin mi consentimiento firmado, para que mi dirección no quede
   expuesta a monitoreo sin que yo lo sepa.
5. Como **protocolo que integra Pullcord**, quiero que me avisen si cambia
   el administrador o el código (wasm) de uno de mis contratos, para
   detectar un cambio no planeado lo antes posible.
6. Como **agente de IA**, quiero pagar por cada consulta de alto volumen con
   x402 en vez de necesitar una cuenta o una tarjeta, para integrarme sin
   intervención humana.
7. Como **usuario de DeFi**, quiero poder darme de baja y borrar mis datos
   (chat ID o URL de webhook) en cualquier momento, para no quedar
   suscrito indefinidamente a algo que ya no quiero.

## La más importante y por qué

| Orden de importancia | Historia # | Por qué |
| :---: | :---: | --- |
| 1 (la más importante) | 4 | Sin consentimiento verificable no hay producto: es la diferencia real frente a un panel de monitoreo normal, y sin esto nada de lo demás es confiable. |
| 2 | 1 | Es el caso de uso mínimo que se puede demostrar completo para el 7-oct: recibir un aviso real de un pago. |
| 3 | 3 | Sin firma en el webhook, cualquiera podría falsificar un aviso; es una condición de seguridad, no una mejora. |
| 4 | 2 | Si integrar toma más de 10 minutos, ningún equipo lo va a adoptar durante el bootcamp. |
| 5 | 7 | Es la contraparte obligatoria de la historia 4: un consentimiento que no se puede revocar no es consentimiento real. |
| 6 | 5 | Importante para los protocolos, pero depende de que primero exista bien el flujo de pagos; se construye encima, no antes. |
| 7 (la menos importante) | 6 | x402 ya funciona en testnet, pero el tier de agentes no es lo que se demuestra en el Demo Day; es la última pieza en activarse. |
