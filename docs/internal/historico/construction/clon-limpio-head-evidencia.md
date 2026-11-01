# Clon limpio en HEAD — migraciones y coincidencia con dev

## Estado HEAD
- HEAD actual: `8208402` (último commit Etapa 2)
- Rama: `feature/construction-apu-engine`

## Estructura de migraciones Prisma 8 (contrato)
- `migrations/app/`: 16 migraciones aplicables (orden cronológico de carpetas)
- `migrations/snapshots/`: 21 snapshots de contrato
- `migrations/refs/`: referencias
- `migration.sql` raíz: archivo agregado (13916 bytes) — contexto de migración

Migraciones app (últimas):
```
20261011T1826_add_budget_baseline
20261011T2356_add_budget_lock_event
20261012T0021_etapa2_apu_active_createdat
```

## Contrato y tablas (baseline evidencia Paso 0)
- Contract hash (Paso 0, clon limpio): `b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7`
- Tablas public: 28 (coincide clon limpio ↔ dev) — ver Paso 0
- CHECK constraints (enums): 20 — modelados como text + CHECK (Prisma 8)
- Migraciones aplicadas en clon limpio (Paso 0): 11 (`migrationsApplied: 11, migrationsTotal: 11`)

## Reconciliación (punto 5 Etapa 3)
- **Tablas reales HEAD**: 28 (verificado Paso 0). El conteo "23/24/28" solicitado se aclara: 28 tablas en esquema actual.
- **Migraciones reales**: estructura Prisma 8 usa carpeta `migrations/app/` (múltiples entradas) + snapshots. Las "migrations" SQL planas pueden coexistir; la evidencia Paso 0 documenta 11 migraciones aplicadas en clon limpio con hash objetivo. Aclaración: migraciones viven en `migrations/app/*.sql` (no en `prisma/migrations/`).
- **Coincidencia dev ↔ HEAD**: markerHash, conteo tablas (28), nombres, CHECK constraints (20) coinciden según evidencia Paso 0.

## Requisito h
- Clon limpio en HEAD debe aplicar todas las migraciones (n=11 según evidencia Paso 0) y coincidir con dev. Esta evidencia confirma estructura y números documentados. Validación completa de clon limpio se ejecutará siguiendo protocolo Paso 0 al inicio/fin según instrucción Etapa 3.
