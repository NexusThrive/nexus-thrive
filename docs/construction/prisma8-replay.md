# Prisma 8 — Replay de migraciones (Data Contract)

## El problema: no hay archivos `.sql` en disco

Prisma 8 (**Data Contract**) funciona distinto a Prisma ORM 7 (`schema.prisma` + `prisma migrate dev`):

| Prisma ORM 7 | Prisma 8 (Data Contract) |
| --- | --- |
| Fuente: `schema.prisma` | Fuente: `prisma/contract.prisma` (PSL) |
| `prisma migrate dev` → genera `migrations/YYYYMMDDHHMM_name/migration.sql` | `prisma contract emit` → emite `contract.json` + `contract.d.ts` + calcula `storageHash` |
| Migraciones se versionan en `prisma/migrations/` | **No hay archivos `.sql` en disco** por defecto |
| `prisma migrate deploy` reaplica `.sql` | `prisma db migrate --db <url>` **replay**: lee el **marker** de la BD, lo compara con el `storageHash` actual, y aplica la diferencia calculada on-the-fly |

## El marker de la base de datos

Prisma 8 guarda un **marker** en la propia base de datos (un comentario/extensión interna con el `storageHash` del contrato aplicado). Al hacer `prisma db migrate`:

1. Lee el marker de la BD → `hash_actual`
2. Calcula el `storageHash` del contrato actual → `hash_objetivo`
3. Si `hash_actual != hash_objetivo`, computa el plan de migración (diff) y lo aplica
4. Actualiza el marker al `hash_objetivo`

**No hay tabla de migraciones** (`_prisma_migrations` no existe en Prisma 8).

## ¿Por qué versionar `migrations/app/` si Prisma 8 no genera `.sql`?

Aunque Prisma 8 no genera `.sql` automáticamente, **el CLI crea directorios en `migrations/app/` cuando haces `prisma migration plan --name <slug>`**:

```
migrations/app/
├── 20261008T0438_baseline/
│   ├── migration.json
│   ├── migration.ts
│   └── ops.json
├── 20261011T1826_add_budget_baseline/
│   ├── migration.json
│   ├── migration.ts
│   └── ops.json
└── refs/
    └── db.json          # { "hash": "<storageHash>" }
```

Estos directorios **no contienen SQL**, sino:
- `migration.json`: metadatos (hashes from/to, operations, timestamps)
- `migration.ts`: operaciones tipadas (TypeScript)
- `ops.json`: lista de operaciones (ADD TABLE, ADD COLUMN, etc.)

**El grafo de migraciones en disco** permite a `prisma db migrate` hacer replay **sin conexión a la BD** (offline path preview con `--from`/`--to`).

## Reproducibilidad en clon limpio

```bash
# 1. Clonar repo
git clone <repo> nexus-thrive && cd nexus-thrive

# 2. Instalar deps
pnpm install

# 3. Crear base vacía
psql "postgresql://user:pw@host:5432/postgres" -c 'create database mi_proyecto'

# 3. Aplicar TODAS las migraciones (replay completo)
set -a; source .env; set +a
pnpm exec prisma db migrate --db "postgresql://user:pw@host:5432/mi_proyecto"

# 4. Verificar
pnpm exec prisma migration status --db "postgresql://user:pw@host:5432/mi_proyecto"
# → "✔ Up to date"
# → markerHash = storageHash del contrato
```

**Salida real de reproducción verificada** (base `nexus_test_lock`):

```
migrationsApplied: 11
markerHash: b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7
tablas: 23 (incluye ApuItem.active, createdAt, imageUrl; ApuActivity.active; BudgetLockEvent)
```

## Migraciones NO versionadas vs versionadas

| Directorio | Versionado | Qué contiene |
| --- | --- | --- |
| `prisma/migrations/app/` | **SÍ** | Grafo de migraciones (JSON/TS), `refs/db.json` |
| `prisma/migrations/snapshots/` | **SÍ** | Snapshots del contrato por migración |
| `migrations/` (raíz) | **NO** (`.gitignore`) | Solo si se usa `prisma migrate dev` estilo ORM 7 |
| `/tmp/.../backups/*.sql` | **NO** | Respaldos `pg_dump` (efímeros, fuera del repo) |

## Reglas de oro

1. **Nunca** borres `migrations/app/` ni `migrations/snapshots/` — son el grafo de replay.
2. **Siempre** corre `prisma contract emit` tras editar `contract.prisma` antes de planificar migraciones.
3. **Nunca** edites a mano `migration.json` / `migration.ts` / `ops.json` — son generados.
4. Los respaldos `pg_dump` viven en `/home/craxker/backups/nexus-thrive/` (fuera del repo).
5. Para reproducir un hash exacto: `prisma db migrate --db <url> --to <hash>`.
6. `prisma migration status --db <url>` valida que la BD coincida con el contrato actual.

## Referencia de comandos

| Comando | Qué hace |
| --- | --- |
| `prisma contract emit` | Genera `contract.json`, `contract.d.ts`, calcula `storageHash` |
| `prisma migration plan --name <slug>` | Crea directorio en `migrations/app/` con el plan |
| `prisma db migrate --db <url>` | Aplica migraciones (replay) contra BD |
| `prisma db migrate --db <url> --to <hash>` | Aplica hasta un hash específico |
| `prisma migration status --db <url>` | Verifica estado (Up to date / pending) |
| `prisma migration list` | Lista migraciones en disco |
| `prisma migration show <dir>` | Inspecciona una migración en disco |