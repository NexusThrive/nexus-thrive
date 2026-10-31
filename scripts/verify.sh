#!/usr/bin/env bash
# ============================================================================
# pnpm verify: lo que corre el CI, de principio a fin y sin ocultar fallos.
#
# Antes `verify` era una cadena de `&&` con `| tail` y `| grep` en medio. Un
# pipe devuelve el código de su ÚLTIMA etapa, así que si `pnpm test`,
# `pnpm test:integration` o `pnpm build` fallaban, `tail` devolvía 0 y la cadena
# seguía como si nada. Aquí cada comprobación se ejecuta por separado: si
# falla, se muestra TODA su salida y el script termina con su código.
# ============================================================================
set -euo pipefail

# run_quiet <líneas> <comando…>: pasa → solo las últimas N líneas; falla → todo.
run_quiet() {
  local lines="$1"
  shift
  local out status=0
  out="$("$@" 2>&1)" || status=$?
  if [ "$status" -ne 0 ]; then
    printf '%s\n' "$out"
    echo "✗ verify: falló (código $status): $*" >&2
    return "$status"
  fi
  printf '%s\n' "$out" | tail -n "$lines"
}

pnpm exec tsc --noEmit
pnpm check:layers
# Pruebas unitarias SIN base de datos, como el CI (`TEST_DATABASE_URL: ""`): si la variable
# estuviera definida, `pnpm test` también correría las de integración y en PARALELO, y
# varias tocan tablas de plataforma compartidas (p. ej. el rol «ops») y se pisan.
# La integración va después, por su script, que sí las corre una tras otra.
run_quiet 3 env TEST_DATABASE_URL= pnpm test --run
run_quiet 3 pnpm test:integration

# El build pasa o falla por su código; las líneas de rutas son solo un resumen.
build_out=""
build_status=0
build_out="$(pnpm build 2>&1)" || build_status=$?
if [ "$build_status" -ne 0 ]; then
  printf '%s\n' "$build_out"
  echo "✗ verify: falló (código $build_status): pnpm build" >&2
  exit "$build_status"
fi
printf '%s\n' "$build_out" | { grep -E '○|ƒ' || true; } | tail -n 2
echo "✓ verify: todo en verde"
