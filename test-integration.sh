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

pnpm exec vitest run \
  lib/tenant-db.integration.test.ts \
  lib/prisma8-query-patterns.integration.test.ts \
  lib/tenant-db.cache-invalidation.test.ts \
  lib/tenant-db.archived-rejection.test.ts \
  lib/apu-importer.price-behavior.test.ts \
  lib/apu-importer.field-changes.test.ts \
  lib/tenant-db.apu-import.integration.test.ts \
  lib/construction/containers.integration.test.ts
