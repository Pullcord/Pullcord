#!/usr/bin/env bash
# Despliega el registro de consentimiento en testnet con la llave local `pullcord-deployer`.
set -euo pipefail
source "$HOME/.cargo/env"
cd "$(dirname "$0")/.."
stellar contract build >/dev/null
OUT=$(stellar contract deploy --wasm target/wasm32v1-none/release/consent_registry.wasm \
  --source pullcord-deployer --network testnet --alias pullcord-consent 2>&1)
echo "$OUT"
