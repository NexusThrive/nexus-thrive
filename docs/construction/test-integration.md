# Pruebas de integración — `pnpm test:integration`

## Propósito

Ejecutar las pruebas que requieren una base de datos real (capa de datos `tenant-db.ts`)
**sin tocar la base de desarrollo**. Validan:

- Compare-and-set del estado del proyecto (`updateProject` con `STALE_STATUS`)
- Guardas de no-op (no suben revisión)
- Rechazo por presupuesto bloqueado (`createChapter`, `updateChapter`, `deleteChapter`, `deleteItem`, `updateAiu`)
- Rechazo por tenant cruzado (cadena de pertenencia)
- Línea base: inmutabilidad, versiones, `approveBaseline`
- Autor de bitácora desde sesión
- Transiciones válidas/inválidas/terminales del proyecto
- `verifyTotals`

---

## Requisitos

1. **Base de datos aparte** (no la de desarrollo).
2. `TEST_DATABASE_URL` exportada en el entorno.
3. `DATABASE_URL` apuntando a **esa misma base** (el script lo valida).

---

## Uso

```bash
# 1) Crear base aparte (una sola vez)
psql "$DATABASE_URL_SIN_PARAMS" -c 'create database nexus_test'

# 2) Aplicar esquema (una sola vez por cambio de contrato)
set -a; source .env; set +a
TESTDB="postgresql://postgres:<pw>@localhost:5432/nexus_test"
pnpm exec prisma db migrate --db "$TESTDB"

# 3) Ejecutar pruebas de integración
TEST_DATABASE_URL="$TESTDB" DATABASE_URL="$TESTDB" pnpm test:integration
#   → Test Files 1 passed · Tests 26 passed
```

---

## Qué hace el script `test-integration.sh`

1. Verifica que exista `TEST_DATABASE_URL`.
2. Verifica que `DATABASE_URL` (sin query params) coincida con `TEST_DATABASE_URL` (sin query params).
   - Si no coinciden, **falla a propósito** para no tocar datos de desarrollo.
3. Ejecuta `vitest run lib/tenant-db.integration.test.ts`.

---

## En CI (ejemplo GitHub Actions)

```yaml
- name: Setup test database
  run: |
    createdb nexus_test
    psql -d nexus_test -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
  env:
    PGPASSWORD: ${{ secrets.PG_PASSWORD }}

- name: Apply migrations
  run: pnpm exec prisma db migrate --db "postgresql://postgres:${{ secrets.PG_PASSWORD }}@localhost:5432/nexus_test"

- name: Run integration tests
  run: pnpm test:integration
  env:
    TEST_DATABASE_URL: postgresql://postgres:${{ secrets.PG_PASSWORD }}@localhost:5432/nexus_test
    DATABASE_URL: postgresql://postgres:${{ secrets.PG_PASSWORD }}@localhost:5432/nexus_test
```

---

## Qué NO cubre (y por qué)

| Tema | Estado | Razón |
| --- | --- | --- |
| Denegación por rol extremo a extremo | ❌ | Requiere sesión Clerk real; probado solo helper puro `canGovernBudget` |
| `revalidatePath` | ❌ | Efecto de Next.js server action; no testeable en unit/integración |
| UI / component tests | ❌ | Requieren `@testing-library/react` + JSDOM; fuera de scope |
| `advanceWindow` | ❌ | Sin llamador (código muerto) |

---

## Añadir nuevas pruebas de integración

1. Añade un `describe.skipIf(!enabled)(...)` en `lib/tenant-db.integration.test.ts`.
2. Usa `beforeAll`/`afterAll` para crear/borrar tenants propios (cascade).
3. Cada bloque aísla su fixture (`tenant-cas-*`, `test-bud-*`).
4. **Nunca** uses la base de desarrollo (`DATABASE_URL` del `.env`).