# Cómo agregar una funcionalidad

[← Guías](README.md)

La receta que sigue el código hoy. Cada paso tiene una prueba o una regla de
lint que avisa si te lo saltas. Antes de empezar, lee el flujo de ramas y
versiones en [devops.md](devops.md).

---

## 1. Las piezas y dónde van

```
app/[tenant]/(app)/<ruta>/
  page.tsx            ← delgada: contexto → repositorio → componentes
  actions.ts          ← "use server": contexto → permiso → validación → servicio
  _components/        ← cliente; recibe datos y permisos ya resueltos por props
lib/<dominio>/
  <algo>.ts           ← reglas puras (validar, calcular). Se prueban sin base
  <algo>-db.ts        ← repositorio: recibe tenantId, filtra SIEMPRE por él
  <algo>.test.ts      ← unitarias
  <algo>.integration.test.ts
```

| Necesitas… | Usa | Archivo |
|---|---|---|
| Saber quién es y de qué negocio | `requirePageContext(slug, route)` en páginas · `requireTenantContext(slug, route)` en acciones | `lib/tenant/context.ts` |
| Saber si su rol puede | `can(ctx.role, "<permiso>")` | `lib/business/permissions.ts` |
| Mover dinero (cobrar, pagar, vender, anular) | `moneyTransaction`, `recordIncome`, `payInvoice`, `sellProduct`, `voidPayment` | `lib/business/money-service.ts` |
| Dejar rastro de algo sensible | `logTenantAction(ctx, "BIZ_…", {...})` | `lib/tenant/audit.ts` |
| Leer o escribir datos del negocio | Un repositorio de `lib/` que recibe `tenantId` | `lib/business/*-db.ts`, `createTenantDb` en `lib/tenant/db.ts` |
| Que la pantalla aparezca en el menú | Entrada en `MODULE_NAV` | `lib/navigation/tenant-nav.ts` |

Prohibido en `app/`: importar `@/prisma/db` (ESLint lo bloquea), redefinir o
renombrar `requireTenantContext`/`requirePageContext` (lo bloquea
`page-authorization.test.ts`), y decidir permisos con `role === "OWNER"` sueltos.

---

## 2. Receta A · Algo nuevo dentro de un módulo que ya existe

El caso más común (por ejemplo: "exportar el inventario", "nota en un cobro").

### Paso 1 · La regla pura y su prueba

```ts
// lib/business/inventory.ts
export function validateExport(input: ExportInput): string | null { … }
```

```ts
// lib/business/inventory.test.ts
test("no exporta un rango vacío", () => { … });
```

### Paso 2 · El repositorio

Recibe `tenantId` como primer argumento y lo pone en **cada** `where`. No
recibe nunca el `slug` ni confía en datos del navegador para saber el negocio.

```ts
// lib/business/products-db.ts
export async function listForExport(tenantId: string, filter: ExportFilter) {
  return db.orm.public.Product.where({ tenantId, active: true }) … .all();
}
```

Si toca dinero, **no** escribas en `Payment`/`CashMovement` desde aquí: usa
`money-service.ts`, que hace todo dentro de una transacción y no cobra dos
veces lo mismo.

### Paso 3 · El permiso

Si ningún permiso existente encaja, agrégalo en `BUSINESS_PERMISSIONS` y su fila
en la matriz de `permissions.test.ts` (la prueba falla si solo haces uno de los
dos). Nombre: `<área>.<verbo>`, por ejemplo `inventory.export`.

### Paso 4 · La acción

```ts
// app/[tenant]/(app)/inventory/actions.ts
export async function exportInventoryAction(slug: string, filter: ExportFilter): Promise<Result> {
  const ctx = await requireTenantContext(slug, "/inventory"); // sesión + negocio + membresía + módulo
  if (!ctx || !can(ctx.role, "inventory.export")) return DENIED;
  const error = validateExport(filter);
  if (error) return { ok: false, message: error };
  const rows = await listForExport(ctx.tenantId, filter);
  await logTenantAction(ctx, "BIZ_…", { count: rows.length }); // solo si es sensible
  return { ok: true, rows };
}
```

Orden fijo: **contexto → permiso → validación → servicio → bitácora →
`revalidatePath`**. El mensaje de rechazo es genérico ("Tu rol no permite esta
acción."): no le digas a quien no tiene acceso si el negocio o el registro
existen.

### Paso 5 · La pantalla

```tsx
// app/[tenant]/(app)/inventory/page.tsx
const ctx = await requirePageContext(tenant, "/inventory");
…
<CatalogView canExport={can(ctx.role, "inventory.export")} … />
```

El componente de cliente recibe el permiso por props y **oculta** el botón.
Ocultar es comodidad; la seguridad es el chequeo de la acción.

### Paso 6 · Verificar

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
DATABASE_URL=$TEST_DATABASE_URL pnpm test:integration   # si tocaste datos
```

Y pruébalo en `pnpm dev` con dos roles: uno que puede y uno que no.

---

## 3. Receta B · Un módulo nuevo

Hoy un módulo se declara en varios sitios (es deuda conocida: ARCH-01, se
resuelve con el registro de capacidades de
[ADR-0003](../nexus-architecture/decisions/0003-registro-de-capacidades.md)).
TypeScript te avisa de casi todos porque son `Record<ModuleValue, …>`.

| # | Dónde | Qué |
|---|---|---|
| 1 | `prisma/contract.prisma` → `enum ModuleName` | El valor nuevo. Necesita migración **y** SQL de producción (ver [devops.md](devops.md#sql-de-producción)) |
| 2 | `lib/admin/catalogs.ts` | `BASE_MODULES` o `SPECIALIZED_MODULES`, y `MODULE_LABELS` |
| 3 | `lib/navigation/tenant-nav.ts` → `MODULE_NAV` | Ruta, icono y etiqueta. De aquí sale también qué rutas exige el servidor (`modulesForRoute`) |
| 4 | `lib/onboarding/module-meta.ts` y `presets.ts` | Icono, descripción y en qué rubros viene activado |
| 5 | `lib/plans/catalog.ts` y `lib/plans/pricing.ts` | Precio y descripción comercial; `READY_MODULES` solo cuando ya funcione |
| 6 | `app/[tenant]/(app)/<ruta>/` | `page.tsx` + `actions.ts` siguiendo la receta A |

No la agregues al menú hasta que tenga página: la prueba de arquitectura y el
usuario se encuentran un 404 (así pasó con `/departures`).

Al pasar la ruta a `requirePageContext(tenant, "/<ruta>")` el servidor ya no
sirve la página ni las acciones si el negocio tiene el módulo apagado.

---

## 4. Si cambias el modelo de datos

1. Edita `prisma/contract.prisma`.
2. `pnpm prisma contract emit`
3. `pnpm prisma migration plan --name <nombre>`
4. `pnpm exec prisma db migrate --db "$DATABASE_URL"` (desarrollo) y otra vez
   contra `$TEST_DATABASE_URL`.
5. Escribe el SQL de producción en `docs/prod-sql/AAAA-MM-DD-<nombre>.sql`,
   aditivo e idempotente (`IF NOT EXISTS`), y anótalo en `00-ORDEN.md`.

Toda tabla de negocio lleva `tenantId` con FK a `Tenant` e índice que empiece
por `tenantId`. Las columnas nuevas en tablas con datos son opcionales o
tienen valor por defecto: la app nueva y la base vieja conviven unos minutos
durante el despliegue.

---

## 5. Lista antes de abrir el PR

- [ ] La página llama a `requirePageContext(tenant, "/<ruta>")`.
- [ ] Cada acción llama a `requireTenantContext(slug, "/<ruta>")` y a `can(...)`.
- [ ] Ningún archivo nuevo de `app/` importa `@/prisma/db`.
- [ ] Todo `where` del repositorio lleva `tenantId`.
- [ ] El dinero pasa por `money-service.ts`.
- [ ] Lo destructivo o sensible deja `logTenantAction`.
- [ ] Hay prueba: unitaria para la regla; integración si toca datos (y está en
      la lista de `test-integration.sh`).
- [ ] Si cambió el contrato: migración + SQL de producción + `00-ORDEN.md`.
- [ ] Probado en `pnpm dev` con un rol que puede y uno que no.
