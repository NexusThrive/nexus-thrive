# Cómo correr y escribir pruebas

[← Guías](README.md)

NEXUS tiene tres capas de verificación. Las tres corren en el CI
(`.github/workflows/ci.yml`) en cada PR y en cada push a `main`.

| Capa | Qué comprueba | Comando | Necesita base |
|---|---|---|---|
| Estática | Tipos y reglas de lint (incluidas las de arquitectura) | `pnpm exec tsc --noEmit` · `pnpm lint` | No |
| Unitaria | Reglas puras: permisos, cálculos, validaciones, y pruebas que leen el código (arquitectura) | `pnpm test` | No |
| Integración | Lo que pasa contra Postgres de verdad: dinero, aislamiento, invitaciones, construcción | `pnpm test:integration` | Sí, una aparte |

`pnpm verify` corre todo seguido, más el build.

---

## 1. Preparar la máquina (una vez)

```bash
pnpm install
```

`tsc` se queda sin memoria con el tope por defecto. Exporta esto en tu shell
(o en `~/.bashrc`):

```bash
export NODE_OPTIONS=--max-old-space-size=4096
```

### Base de pruebas

Las pruebas de integración **borran y crean datos**. Nunca apuntan a la base de
desarrollo ni a producción: el script se niega a correr si `DATABASE_URL` y
`TEST_DATABASE_URL` no son la misma base.

```bash
createdb nexus_test
psql nexus_test -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexus_test
DATABASE_URL=$TEST_DATABASE_URL pnpm exec prisma db migrate --db "$TEST_DATABASE_URL"
```

Vuelve a migrar cada vez que entre una migración nueva a `migrations/app/`.

---

## 2. Correr

```bash
pnpm test                                    # unitarias (las de integración se omiten solas)
pnpm exec vitest run lib/business            # solo una carpeta
pnpm exec vitest lib/business/permissions    # en modo watch mientras trabajas

DATABASE_URL=$TEST_DATABASE_URL pnpm test:integration
```

Las pruebas de integración tienen un tope de 20 s cada una
(`--testTimeout=20000`): las de concurrencia lanzan escrituras en paralelo y en
una máquina cargada el tope por defecto da falsos fallos.

`pnpm test:integration` también corre `scripts/check-prod-sql.sh`: si tu rama
cambió `prisma/contract.prisma` sin traer un `.sql` nuevo en `docs/prod-sql/`,
falla. Ver [devops.md](devops.md#sql-de-producción).

---

## 3. Qué tipo de prueba escribir

| Si cambias… | Escribe | Ejemplo a copiar |
|---|---|---|
| Quién puede hacer qué | Fila en la matriz de `permissions.test.ts` | `lib/business/permissions.test.ts` |
| Un cálculo o una validación pura | Unitaria junto al archivo | `lib/business/museum.test.ts` |
| Algo que mueve dinero, stock o recibos | Integración con concurrencia | `lib/business/money-service.integration.test.ts` |
| Aislamiento entre negocios o membresías | Integración con dos negocios | `lib/tenant/db.integration.test.ts`, `lib/tenant/membership.integration.test.ts` |
| Una página o acción nueva de un módulo | Nada a mano: las pruebas de arquitectura ya la revisan | `lib/tenant/page-authorization.test.ts` |
| Un bug | Primero la prueba que falla con el bug, después el arreglo | — |

### Pruebas de arquitectura (ya existen; no las saltes)

Estas pruebas leen el código fuente y fallan si una regla se rompe. Si una
falla, el mensaje dice qué falta.

| Prueba | Regla |
|---|---|
| `lib/tenant/page-authorization.test.ts` | Toda `page.tsx` de `app/[tenant]` llama a `requirePageContext`/`requireTenantContext`, y pasa la ruta de su módulo. Toda `actions.ts` de un módulo pasa su ruta. Nadie redefine ni renombra el helper |
| `lib/tenant/data-access.test.ts` | La lista de deuda `eslint/legacy-db-access.mjs` solo se achica |
| `lib/business/permissions.test.ts` | La matriz rol × permiso escrita a mano coincide con `permissions.ts` |
| ESLint `no-restricted-imports` | `app/` no importa `@/prisma/db` (salvo la lista de deuda) |

---

## 4. Escribir una prueba de integración

Plantilla mínima (copia la cabecera de una que ya exista):

```ts
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("mi flujo (integración)", () => {
  const suffix = Date.now().toString(36);
  let tenantId = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("Estas pruebas exigen una base aparte: DATABASE_URL=$TEST_DATABASE_URL.");
    }
    const tenant = await createAdminDb().createTenant({
      name: "Negocio Prueba",
      slug: `prueba-${suffix}`,
      vertical: "gym",
      modules: [],
      tenantType: "COMPANY",
      ownerEmail: `dueno.${suffix}@ejemplo.com`,
    });
    tenantId = String(tenant.id);
  });

  afterAll(async () => {
    if (tenantId) await deleteTenantCompletely(tenantId);
    await db.close();
  });

  test("…", async () => {
    // Llama a la función real de lib/, no a una copia.
  });
});
```

Reglas:

1. **Nombre** `*.integration.test.ts` y **añádela a la lista de
   `test-integration.sh`**. El script corre una lista explícita: una prueba que
   no está ahí no corre en el CI.
2. Cada prueba crea su propio negocio con un sufijo único y lo borra al final
   con `deleteTenantCompletely`. Nunca dependas de datos de otra prueba.
3. Para dinero, prueba también el caso concurrente: lanza el mismo cobro varias
   veces con `Promise.all` y comprueba que queda **uno**.
4. Para aislamiento, crea **dos** negocios y comprueba que uno no ve lo del otro.

---

## 5. Cuando algo falla

| Síntoma | Causa habitual |
|---|---|
| `JavaScript heap out of memory` en `tsc` | Falta `NODE_OPTIONS=--max-old-space-size=4096` |
| `RUNTIME.TEMPORAL_UNAVAILABLE` | Una prueba se saltó `vitest.setup.ts` (no la corras fuera de vitest) |
| `Estas pruebas exigen una base aparte` | `DATABASE_URL` no es igual a `TEST_DATABASE_URL` |
| `relation … does not exist` | La base de pruebas no está migrada al día |
| Timeout solo en el CI o con la máquina cargada | Prueba de concurrencia lenta: revisa que no haga trabajo de más; el tope ya es 20 s |
| Falla `page-authorization.test.ts` con una página nueva | Falta `requirePageContext(tenant, "/<ruta>")` |
| El CI falla en un paso sin log | Falla de GitHub Actions: re-ejecuta el job antes de investigar |
