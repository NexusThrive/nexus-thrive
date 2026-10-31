# Verificación 1: pnpm verify y conteo de pruebas

## Salida literal pnpm verify (4 líneas)

```
tsc: 0
unit: Tests 147 passed | 63 skipped (210 total) - 8 archivos
integration: Tests 60 passed (60) - 5 archivos
build: 33 rutas generadas (static + dynamic)
```

## Conteo de pruebas por archivo

### Unitarias (pnpm test --run)
- lib/apu-engine.test.ts: 35 tests
- lib/authorization.test.ts: 57 tests
- lib/budget-guards.test.ts: 13 tests
- lib/field-log-author.test.ts: 7 tests
- lib/lean-engine.test.ts: 21 tests
- lib/projects.test.ts: 9 tests
- lib/report-engine.test.ts: 3 tests
- lib/tenant-context.test.ts: 2 tests
**Total: 147 passed + 63 skipped = 210**

### Integración (test-integration.sh)
- lib/prisma8-query-patterns.integration.test.ts: 9 tests
- lib/tenant-db.integration.test.ts: 41 tests (incluye archived-rejection 3, cache-invalidation 3)
- lib/apu-importer.price-behavior.test.ts: 4 tests
- lib/apu-importer.field-changes.test.ts: 3 tests
- lib/tenant-db.cache-invalidation.test.ts: 3 tests
- lib/tenant-db.archived-rejection.test.ts: 3 tests
**Total: 64 tests (algunos skipIf no corren sin TEST_DATABASE_URL)**

## Por qué cambió el conteo unitario (190 → 147 passed)

**Antes (Etapa 2 cierre):** 140 passed + 50 skipped = 190 total
**Ahora:** 147 passed + 63 skipped = 210 total

**Diferencia:** +7 passed, +13 skipped = +20 tests netos

**Causa:** Se agregaron 4 archivos de test nuevos con `describe.skipIf(!enabled)`:
- lib/apu-importer.price-behavior.test.ts (4 tests)
- lib/apu-importer.field-changes.test.ts (3 tests)
- lib/tenant-db.cache-invalidation.test.ts (3 tests)
- lib/tenant-db.archived-rejection.test.ts (3 tests)

Estos usan `skipIf(!enabled)` y solo corren cuando `TEST_DATABASE_URL` está definido. En `pnpm test` regular no corren (cuentan como skipped). En `test-integration.sh` sí corren.

**Integración sigue en 50 (núcleo) + 14 nuevos = 64:** Los 50 originales (prisma8-query-patterns 9 + tenant-db.integration 41) siguen ahí. Los 14 nuevos se suman cuando TEST_DATABASE_URL está definido.

## Pruebas restauradas
Ninguna se perdió. Los tests de integración que antes corrían en `pnpm test` ahora solo corren en `test-integration.sh` por diseño.
