#!/usr/bin/env bash
# Prueba de punta a punta del registro de consentimiento en testnet.
# La referencia es sha256 de un texto de demo: en la cadena no va ningun dato personal.
set -euo pipefail
source "$HOME/.cargo/env"
CID="${1:?uso: demo-testnet.sh CONTRACT_ID}"
OWNER=$(stellar keys address pullcord-deployer)
REF=$(printf 'pullcord:demo:semana4:suscripcion-A' | sha256sum | cut -d' ' -f1)
REF2=$(printf 'pullcord:demo:semana4:suscripcion-B' | sha256sum | cut -d' ' -f1)
inv() { stellar contract invoke --id "$CID" --source pullcord-deployer --network testnet -- "$@"; }
echo "owner=$OWNER"; echo "refA=$REF"; echo "refB=$REF2"
echo "== is_active A (antes)";    inv is_active --owner "$OWNER" --reference "$REF"
echo "== register A";             inv register  --owner "$OWNER" --reference "$REF"  2>&1 | tail -4
echo "== is_active A (despues)";  inv is_active --owner "$OWNER" --reference "$REF"
echo "== register B";             inv register  --owner "$OWNER" --reference "$REF2" 2>&1 | tail -4
echo "== register A otra vez (debe fallar: AlreadyActive)"; inv register --owner "$OWNER" --reference "$REF" 2>&1 | tail -3 || true
echo "== revoke A";               inv revoke    --owner "$OWNER" --reference "$REF"  2>&1 | tail -4
echo "== is_active A (retirado)"; inv is_active --owner "$OWNER" --reference "$REF"
echo "== get A";                  inv get       --owner "$OWNER" --reference "$REF"
echo "== is_active B (sigue)";    inv is_active --owner "$OWNER" --reference "$REF2"
