#!/usr/bin/env bash
set -euo pipefail

if [ -z "${TEST_DATABASE_URL:-}" ]; then
  echo "Error: TEST_DATABASE_URL no definida."
  echo "Crea una base aparte y exporta TEST_DATABASE_URL."
  exit 1
fi

# Normalizar URLs quitando parámetros de query
normalize() { echo "${1%%\?*}"; }
if [ "$(normalize "$DATABASE_URL")" != "$(normalize "$TEST_DATABASE_URL")" ]; then
  echo "Error: DATABASE_URL debe apuntar a la misma base que TEST_DATABASE_URL."
  echo "Ejecuta: DATABASE_URL=\$TEST_DATABASE_URL TEST_DATABASE_URL=\$TEST_DATABASE_URL pnpm test:integration"
  exit 1
fi

# Regla de oro: si el cambio toca el modelo de datos, tiene que traer su SQL
# de producción. El CI corre este script, así que el faltante se ve ahí.
# (Si el clon es superficial y no hay historia, se omite sin molestar.)
if [ -d .git ] && git rev-parse --verify origin/main > /dev/null 2>&1; then
  bash ./scripts/check-prod-sql.sh origin/main
fi

# Las pruebas de concurrencia lanzan escrituras en paralelo contra una sola
# base: en una máquina cargada el tope por defecto (5 s) da falsos fallos.
# Los archivos corren uno tras otro: varios tocan tablas de la plataforma
# (roles del panel, catálogo de planes) y en paralelo se pisaban entre sí
# (p. ej. uno borraba el rol "ops" que el otro estaba usando).
#
# Qué corre: TODA prueba `*.integration.test.ts` (en tests/integration/)
# más cuatro que no llevan «integration» en el nombre. Antes había una lista
# escrita a mano y 34 pruebas quedaron fuera sin que nadie lo notara; con el
# patrón, una prueba nueva entra sola.
#
# Qué NO corre: `*.file.integration.test.ts` (importan un archivo real del
# cliente, p. ej. el MASTER PACK, indicado con una variable de entorno que no
# está en el repositorio). Se ejecutan a mano:
#   MASTER_PACK_FILE=/ruta/al/archivo.xlsx pnpm exec vitest run \
#     tests/integration/industry/construction/apu-importer/master-pack-import.file.integration.test.ts
pnpm exec vitest run --testTimeout=20000 --no-file-parallelism \
  --exclude '**/*.file.integration.test.ts' \
  '.integration.test.ts' \
  tests/integration/core/tenancy/db.archived-rejection.test.ts \
  tests/integration/core/tenancy/db.cache-invalidation.test.ts \
  tests/integration/industry/construction/apu-importer/price-behavior.test.ts \
  tests/integration/industry/construction/apu-importer/field-changes.test.ts
