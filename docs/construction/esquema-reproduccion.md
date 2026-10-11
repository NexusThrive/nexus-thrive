# Esquema de base de datos — Reproducción y respaldos

## `prisma/migrations/app/` — ¿está gitignored?

**Sí.** `.gitignore` líneas 44–45:

```
/prisma/migrations
migrations
```

**Por qué:** Prisma 8 (Data Contract) **no genera archivos de migración en disco** como Prisma ORM 7 (`schema.prisma` + `migrations/*.sql`). El flujo es:

1. **Fuente de verdad:** `prisma/contract.prisma` (PSL del contrato).
2. **Hash del contrato:** `prisma contract emit` emite `prisma/contract.json` + `prisma/contract.d.ts` y calcula `storageHash`.
3. **Comparación:** `prisma db migrate --db <url>` lee el **marker** guardado en la base de datos (un comentario/extensión interna con el hash), lo compara con el `storageHash` actual del contrato, y aplica la diferencia directamente (plan de migración calculado on-the-fly).
4. **Referencia (`ref`):** El hash aplicado se almacena como "ref" en la base (`db update --advance-ref db` actualiza ese marker). No hay carpeta `migrations/` versionada.

Por tanto, **no hay artefactos de migración que commitear**. Lo que versionamos es `prisma/contract.prisma` (y `prisma/contract.json`/`prisma/contract.d.ts` generados).

---

## Cómo reproducir el esquema en otro entorno

### Opción A: Base nueva (recomendado para CI / entornos limpios)

```bash
# 1. Crea la base de datos vacía
psql "postgresql://user:pw@host:5432/postgres" -c 'create database mi_proyecto'

# 2. Aplica el contrato completo (equivalente a "migrate all")
set -a; source .env; set +a
pnpm exec prisma db migrate --db "postgresql://user:pw@host:5432/mi_proyecto"
#   → migrationsApplied: N, markerHash: <storageHash actual>

# 3. (Opcional) Verifica estado
pnpm exec prisma migration status --db "postgresql://user:pw@host:5432/mi_proyecto"
#   → "✔ Up to date"
```

### Opción B: Desde un hash conocido (reproducir exactamente una versión)

```bash
# Avanza la base a un hash específico del contrato (p.ej. el de la release)
pnpm exec prisma db migrate --db "$DATABASE_URL" --to 07381774a799e22873af0cbf20aff2bc46ae1d20c2bd9e6b63a27eb935c8c335
```

### Opción C: Previsualizar sin tocar la base (offline)

```bash
# Compara el hash actual del contrato contra un hash anterior
pnpm exec prisma migration status --from 985cb4f27cce6a5f8048ccb570044afcd497859e90820d6c6c64a4b4e9e9cd18 --to HEAD
# Muestra el árbol de migraciones que se aplicarían
```

> **Nota:** El CLI requiere `DATABASE_URL` en el entorno (`.env` o exportada). `dotenv/config` en `prisma/db.ts` carga `.env` pero **no sobreescribe** variables ya exportadas → `DATABASE_URL=... pnpm exec prisma ...` funciona.

---

## Respalados `pg_dump`

Ubicación **fuera del repo** (no se commitean):

```
/home/craxker/backups/nexus-thrive/
├── nexus-dev-20261011-131710-pre-revision.sql   (4.1 MiB, antes de `20261011T1817_add_budget_revision`)
└── nexus-dev-20261011-132610-pre-baseline.sql    (4.2 MiB, antes de `20261011T1826_add_budget_baseline`)
```

**Restauración (solo si la base de desarrollo se corrompe):**

```bash
set -a; source .env; set +a
BASE="${DATABASE_URL%%\?*}"
psql "$BASE" < /home/craxker/backups/nexus-thrive/nexus-dev-20261011-132610-pre-baseline.sql
```

---

## Regla de oro

| Qué se versiona | Qué NO se versiona |
| --- | --- |
| `prisma/contract.prisma` | `prisma/migrations/` (no existe en Prisma 8) |
| `prisma/contract.json` (generado) | Respaldos `pg_dump` |
| `prisma/contract.d.ts` (generado) | Marker/ref interno de la base |
| `migrations/app/refs/db.json` **no existe** en Prisma 8 | — |

> Si necesitas auditar qué migraciones se aplicaron en una base existente: `pnpm exec prisma migration status --db "$DATABASE_URL"` (muestra el árbol con `migrationHash`, `dirName` y `✓ applied` / `○ pending`).

---

## Hash actual del contrato (Etapa 1 cerrada)

```
storageHash / markerHash: 07381774a799e22873af0cbf20aff2bc46ae1d20c2bd9e6b63a27eb935c8c335
```

Este hash coincide con el que reporta `prisma db migrate` al aplicar en una base nueva y con el que guarda `prisma migration status` como destino.