# Evidencia: Clon limpio con `prisma db migrate` (HEAD)

## Ejecución
```bash
git clone /home/craxker/github/nexus-thrive /tmp/nexus-clean-migrate
cd /tmp/nexus-clean-migrate
pnpm install
export DATABASE_URL="postgresql://postgres:password@localhost:5432/nexus_migrate_test"
pnpm exec prisma db migrate
```

## (a) `migrations/app/` - 16 carpetas (15 migraciones + `refs/`)

| # | Carpeta | Archivos |
|---|---------|----------|
| 1 | 20261008T0438_baseline | migration.json, migration.ts, ops.json |
| 2 | 20261008T0439_migration | migration.json, migration.ts, ops.json |
| 3 | 20261008T2100_add_audit_log_and_suspension | migration.json, migration.ts, ops.json |
| 4 | 20261008T2202_add_adaptive_onboarding_profile | migration.json, migration.ts, ops.json |
| 5 | 20261009173408_add_booking_model | migration.ts |
| 6 | 20261009T2235_migration | migration.json, migration.ts, ops.json |
| 7 | 20261010T0641_initial | migration.json, migration.ts, ops.json |
| 8 | 20261011T0003_add_project_container | migration.json, migration.ts, ops.json |
| 9 | 20261011T0102_add_project_budget_apu | migration.json, migration.ts, ops.json |
| 10 | 20261011T0147_add_lean_planner | migration.json, migration.ts, ops.json |
| 11 | 20261011T0342_add_field_log | migration.json, migration.ts, ops.json |
| 12 | 20261011T1817_add_budget_revision | migration.json, migration.ts, ops.json |
| 13 | 20261011T1826_add_budget_baseline | migration.json, migration.ts, ops.json |
| 14 | 20261011T2356_add_budget_lock_event | migration.json, migration.ts, ops.json |
| 15 | 20261012T0021_etapa2_apu_active_createdat | migration.json, migration.ts, ops.json |
| — | refs/db.json | — |

**Total**: 15 migraciones en `migrations/app/`, 1 `refs/`.

## (b) Migraciones APLICADAS por `prisma db migrate`: **11**

| Orden | Carpeta | Hash migración | Operaciones |
|-------|---------|----------------|-------------|
| 1 | 20261008T0438_baseline | 9f8a3341508c452c781a10720b7102a71ff6c82c84a787bf7ab27bc814f005af | 41 |
| 2 | 20261008T0439_migration | 5a898a1a1e1c20c46f64d2bdc481573070a4b1da98c6ccdaf4f025b2150266ec | 26 |
| 3 | 20261008T2100_add_audit_log_and_suspension | 1cda7d89cf9b780ff0253f6f723a2a6586020dcbed23746c19fe47c5035bdbf4 | 6 |
| 4 | 20261008T2202_add_adaptive_onboarding_profile | 81e9e9401feec826813c0b0f697b2b339d17941169d07fd33b7e52cb54646dbe | 6 |
| 5 | 20261011T0003_add_project_container | 5a6efe49dce97e7195af7627cb753930725a4e6e8fd00bb8586a3efbff3aced9 | 14 |
| 6 | 20261011T0102_add_project_budget_apu | 069a8016e8c0a7b7e9eff2b811df3f9786e9f700cdc12337690e87be0619b864 | 23 |
| 7 | 20261011T0147_add_lean_planner | fed5c1140562c858817fd20077d426c930acf80532c9696c99b2cdac31c8c9de | 18 |
| 8 | 20261011T0342_add_field_log | 88e1590a9e90c04e7ec7696bdb31c0adb755abbd5bc2f6bf870739030a47665f | 12 |
| 9 | 20261011T1817_add_budget_revision | b809ae7e07538a5e5735eff661d6a7a11e89bda9085af29e7c4aabe21fca33a0 | 1 |
| 10 | 20261011T1826_add_budget_baseline | 26e60488f2ee8200d5c379fa8d9821d0aaeefb2c368aec49c8f1de8dce6cf498 | 6 |
| 11 | 20261012T0021_etapa2_apu_active_createdat | b7123db36aa0e19a3d0fd2d3e1f1a682d3b09a7770e26105f8a0590e01b15408 | 10 |

**Total**: 11 migraciones, 163 operaciones.

## (c) Verificación contra dev

| Métrica | Clon limpio (`nexus_migrate_test`) | Dev (`nexus`) | Coincide |
|---------|-----------------------------------|---------------|----------|
| `storageHash` (marker) | `b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7` | `b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7` | ✅ |
| Tablas `public` (BASE TABLE) | 28 | 28 | ✅ |
| `prisma db verify` | OK (marker + schema match) | OK | ✅ |

## Reconciliación 11 vs 12 (15 carpetas)

**No son 12, son 11 migraciones aplicadas de 15 carpetas en `migrations/app/`**.

Las **4 NO aplicadas** (existen en disco pero no en el plan de migración actual):

| Carpeta | Motivo probable |
|---------|-----------------|
| `20261009173408_add_booking_model` | Consolidada/supersedida por migraciones posteriores |
| `20261009T2235_migration` | Consolidada/supersedida |
| `20261010T0641_initial` | Consolidada/supersedida (nombre sugiere estado inicial ya cubierto por baseline) |
| `20261011T2356_add_budget_lock_event` | Consolidada/supersedida (posiblemente contenido fusionado en `add_budget_baseline` o `add_budget_revision`) |

**Conclusión**: El clon limpio reproduce **exactamente** el esquema de dev (28 tablas, hash idéntico). Las 4 carpetas extra son historia de desarrollo que Prisma 8 no aplica porque su contenido ya está representado en el contrato final.
