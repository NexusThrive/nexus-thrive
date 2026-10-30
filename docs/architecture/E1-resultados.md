# E1 — Core deja de importar industrias: resultados

Ejecutado en la rama local `chore/HU-esquema-prisma-modular-01`, sin push ni PR. Decisiones aprobadas: construcción con fábrica propia
(alternativa A), ficha 360° del gimnasio con contrato de aportes (G1), `escapeLike` a Foundation y pruebas de integración en una base desechable.
Auditoría previa: [`auditoria-e1-core-industry.md`](auditoria-e1-core-industry.md).

## Qué cambió

| Paso | Cambio | Dónde |
|---|---|---|
| 1 | `escapeLike` sale de `construction/shared` y pasa a Foundation | `lib/sql-like.ts` |
| 2 | Se elimina `export type * from construction/shared` de Core; los 12 archivos de `app/` que usaban 18 tipos de obra los importan de su dominio | `lib/tenant/db.ts`, `app/…/projects`, `…/catalog` |
| 3 | `createConstructionDb(tenantId)` con las mismas 10 propiedades; Core ya no las compone ni importa construcción | `lib/construction/construction-db.ts` |
| 4a | Fechas de calendario de Bogotá duplicadas entre `memberships.ts` y `lean-engine.ts` pasan a Foundation | `lib/plain-date.ts` |
| 4b | Repositorio de membresías fuera de Core; ficha 360° con contrato G1 | `lib/business/memberships-repo.ts`, `lib/tenant/db.ts` |
| 5 | Los contextos de obra dejan de cargar el tipo interno de Core | `…/reports/actions.ts`, `…/catalog/import/actions.ts` |
| — | `test-integration.sh` corre por patrón todas las `*.integration.test.ts` | `test-integration.sh` |

### Composición (fuera de Core)

Las pantallas y acciones de obra crean `createConstructionDb(tenantId)` junto a `createTenantDb(tenantId)`; en acciones se usa el ayudante local
`construction(context)`. `ensureProjectContainers` recibe un `ConstructionDb`. Core no conoce el módulo y las pantallas que no son de obra ya no cargan su código.
Las del gimnasio crean `createMembershipsDb(tenantId)`.

### Contrato G1 de la ficha 360°

```ts
// lib/tenant/db.ts (Core define el contrato; el gimnasio lo implementa)
type Customer360Contribution = {
  events: CustomerTimelineEvent[];          // eventos de línea de tiempo propios
  lastActivityDate: string | null;          // actividad propia más reciente
  hasRecords: boolean;                      // distingue «sin actividad»
  accountSignal: "overdue" | "current" | null;
};
buildCustomer360(base: Customer360Base, contributions: readonly Customer360Contribution[]): Customer360Details  // función pura
```

- `customers.get360Base(id)` entrega la ficha de Core (pagos y notas). `getCustomer360Memberships(tenantId, id)` (gimnasio) aporta eventos, última
  actividad y señal. La página de la ficha los pide **en paralelo** y los reúne con `buildCustomer360`.
- Reglas del estado de cuenta, en orden: sin registros → sin actividad; aporte vencido → vencido; pagos pendientes → pendiente; aporte vigente o pagos aprobados → al día; si no → sin datos.
- `Customer360Details` ya no incluye `memberships`; la pestaña de membresías las toma del aporte. No hay framework de extensiones: es un tipo y una función.
- Residuo de vocabulario: `CustomerTimelineEvent.type` sigue siendo `"payment" | "membership" | "note"`. Es una cadena de la UI, no un import.

## Excepciones: 64 → 51

Retiradas exactamente 13, ninguna modificada ni añadida: las 12 de la etapa E1 (EX-042 a EX-053) y EX-012 (R2, adelantada con `escapeLike`).
Las demás (E2 12, E3 8, E5 17, E7 4, E9 4, V 6) están intactas. Queda una R1: `EX-011` `business/enrollment-db.ts → business/memberships.ts` (Business →
gimnasio, etapa E2).

## Pruebas

| | Antes de E1 | Después |
|---|---|---|
| Integración (base PostgreSQL 17 desechable) | 57 archivos / 333 pruebas: todas pasan | 58 archivos / 343: todas pasan, 0 omitidas |
| Equivalencia de la ficha 360° | — | 8 escenarios idénticos a la salida anterior (`tests/integration/tenant/customer-360.golden.json`) |
| Contrato G1 (puro) | — | 13 pruebas en `tests/unit/tenant/customer-360-contract.test.ts` |
| Forma de las capas de datos | — | `tests/architecture/e1-core-industria.test.ts` |
| `escapeLike`, `plain-date` | — | `tests/unit/sql-like.test.ts`, `tests/unit/plain-date.test.ts` |

## Lo que queda para E2 y posteriores

- **E2:** `business/enrollment-db.ts` (EX-011) y demás reubicaciones: permisos, roles y equipo a Core; gimnasio y museo a `lib/industry/`; `escapeLike` duplicado en `lib/admin/db.ts`.
- La ficha 360° pide el aporte del gimnasio aunque el módulo de membresías esté inactivo (mismo comportamiento que antes). Se puede omitir la consulta en E2.
- `lib/tenant/db.ts` sigue conteniendo repositorios de Business y Finance (`customers`, `payments`, `bookings`, `expenses`, `finance`).
- Los tres tipos derivados de `createTenantDb` que quedan (ajustes, CRM, membresías) son de Core/Business y consumen Core en su dirección legítima.
