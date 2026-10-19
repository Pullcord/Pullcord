# Registro de consentimiento

Contrato Soroban de Pullcord. Guarda, por dirección (cuenta G o contrato C) y
por referencia de suscripción, si el dueño de esa dirección dio o retiró su
consentimiento para que Pullcord la monitoree.

- La referencia es un hash de 32 bytes: en la cadena no hay URL de webhook,
  chat de Telegram ni otros datos personales.
- `register` y `revoke` exigen la firma del dueño (`require_auth`). Nadie puede
  suscribir la cuenta de otra persona.
- Retirar no borra: el registro queda como `Revoked`, así cualquiera verifica
  que se retiró y en qué ledger.

| Función | Qué hace |
| --- | --- |
| `register(owner, reference)` | Da el consentimiento. Falla con `AlreadyActive` (#1) si ya está vigente. |
| `revoke(owner, reference)` | Lo retira. `NotFound` (#2) si nunca existió, `AlreadyRevoked` (#3) si ya estaba retirado. |
| `get(owner, reference)` | Registro completo (`Active` o `Revoked` y el ledger), o nada. |
| `is_active(owner, reference)` | `true` solo si está vigente. |

Eventos: `consent_registered` y `consent_revoked`, con la dirección y la
referencia como tópicos.

## Desplegado en testnet

Contrato: [`CBAU7N2YV5PHA6LJHFUJKW6J5GFEJAGMYBQFOOEYVJJSQBWV6R7VZJAA`](https://stellar.expert/explorer/testnet/contract/CBAU7N2YV5PHA6LJHFUJKW6J5GFEJAGMYBQFOOEYVJJSQBWV6R7VZJAA).
Las transacciones de prueba están en
[docs/semana4/MVPFunctional.md](../../docs/semana4/MVPFunctional.md).

## Cómo repetirlo

Requisitos: Rust con el target `wasm32v1-none` y la
[CLI de Stellar](https://developers.stellar.org/docs/tools/cli) 27 o más nueva.

```sh
cargo test -p consent-registry        # 8 pruebas unitarias
stellar contract build                # genera el .wasm
```

Para desplegar en testnet, crea una llave local con fondos de Friendbot
(`stellar keys generate pullcord-deployer --network testnet --fund`) y corre
`bash scripts/deploy-testnet.sh`. Después, `bash scripts/demo-testnet.sh
<ID_DEL_CONTRATO>` registra, consulta y retira un consentimiento de ejemplo.

Para comprobar que el servidor lee el contrato desplegado:

```sh
node scripts/check-consent-live.mjs
```

La llave secreta nunca entra al repositorio: vive en el llavero local de la CLI.
