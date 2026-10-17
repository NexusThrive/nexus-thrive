# Auditoría Etapa 0 — Cierre de la rama `feature/construction-apu-engine`

- **Rama:** `feature/construction-apu-engine`
- **Fases ya implementadas:** FASES 1–5 (`8c17ce5`, `1446264`, `943d31e`, `3a0267b`, `d1ba7c1`)
- **Alcance:** vertical de Construcción (proyectos de obra → presupuesto APU/AIU → planificador Lean → bitácora → informes)
- **Método:** solo lectura sobre `prisma/contract.prisma` + código real. Nada marcado como verificado sin evidencia.

---

## 0.1 Inventario de entidades (resumen)

| Dominio | Entidades |
| --- | --- |
| Proyecto | `Project` (1:1 con `ProjectBudget`, `ProjectPlan`, `FieldLog`), `ProjectHeader`(snapshot receptor), `Customer`(FK `customerId`) |
| Presupuesto | `ProjectBudget`, `BudgetChapter`, `BudgetItem`, `BudgetItemResource` |
| Catálogo | `ApuItem`, `ApuActivity`, `ApuActivityComposition` |
| Lean | `ProjectPlan`, `LookaheadTask`, `WeeklyCommitment` |
| Bitácora | `FieldLog`, `FieldLogEntry` |

Hallazgos de esquema:
- `Project.customerName` es **derivado** por join a `Customer` vía `customerId` (FK correcto; no contradice D1).
- `wastePct` **no existe** todavía en `BudgetItemResource` (se agrega en Etapa 3.1).
- `Role` = `SUPERADMIN | OWNER | STAFF`.
- `ProjectStatus` y `ResourceType` coinciden con el contrato (4 tipos: MATERIAL/LABOR/EQUIPMENT/TRANSPORT).

## 0.2 EVM y datos disponibles

- No existe aún **avance físico** ni **costo real** persistido ⇒ PV/EV/SPI/CPI/CV no son medibles con honestidad.
- Decisión (Etapa 1.3): todo indicador EVM sin datos debe mostrarse como **"No medible"** con su razón, nunca como 0 ni estimado.
- El PPC de Lean **no** es avance físico: se reporta como PPC, jamás como porcentaje de obra ejecutada.

## 0.3 Tabla de acciones (completada)

Columnas:
- **Tipo:** `lectura` | `escritura` | `lectura+crea-idempotente` | `borrado`.
- **Rechaza si bloqueado:** ¿la acción rechaza cuando `ProjectBudget.isLocked = true`? (`Sí` / `No aplica` / `N/A`). Fuente: guardas en `tenant-db.budgets.*`.
- **Rol:** rol exigido **hoy** frente al rol **esperado por D7** (`OWNER`/`STAFF`). Hoy ninguna acción valida rol: basta ser miembro del tenant.
- **Revalida:** ¿llama `revalidatePath`? y ruta.
- **Pruebas exigidas (Etapa 1):** `locked` (rechazo con presupuesto bloqueado), `rol` (denegación por rol), `tenant cruzado` (denegación por pertenencia a otro negocio).

### Proyectos — `quotes/projects/actions.ts`

| Acción | Tipo | Rechaza si bloqueado | Rol (hoy → D7) | Revalida | Notas |
| --- | --- | --- | --- | --- | --- |
| `createProjectAction` | escritura | N/A | miembro → OWNER | `/{t}/quotes/projects` | Crea proyecto `DRAFT`; valida violación única de código |
| `updateProjectHeaderAction` | escritura | N/A | miembro → OWNER/STAFF | `/{t}/quotes/projects/{id}` | Ficha/snapshot receptor |

### Presupuesto — `budget/actions.ts`

| Acción | Tipo | Rechaza si bloqueado | Rol (hoy → D7) | Revalida | Notas |
| --- | --- | --- | --- | --- | --- |
| `getOrCreateProjectBudgetAction` | lectura+crea-idempotente | N/A | miembro → OWNER/STAFF | — | `getOrCreate` idempotente (unique `projectId` + relectura ante racing). **Sin expectedRevision** |
| `createChapterAction` | escritura | **Sí** (`budgets.createChapter`) | miembro → OWNER/STAFF | `/{t}/quotes/projects/{id}` | `order = max+1` **fuera** de transacción (1.8) |
| `createBudgetItemAction` | escritura | **Sí** (`budgets.createItem`) | miembro → OWNER/STAFF | `/{t}/quotes/projects/{id}` | `order = max+1` dentro de tx; recalcula totales en tx |
| `updateAiuConfigAction` | escritura | **Sí** (`budgets.updateAiu`) | miembro → **OWNER** | `/{t}/quotes/projects/{id}` | AIU + recálculo en tx |
| `toggleBudgetLockAction` | escritura | N/A (es el propio lock) | miembro → **OWNER** | `/{t}/quotes/projects/{id}` | `setLocked` **no** valida rol (1.5) |
| _ausentes_ | — | — | — | — | **Faltan:** `updateBudgetChapter`, `updateBudgetItem`, `updateProject` (transiciones), `deleteBudgetResource`, `deleteBudgetItem`, `deleteBudgetChapter`, `verifyBudgetTotals`, `approveBaselineAction` (Etapas 1.7/1.9/1.10) |

### Lean — `lean/actions.ts`

| Acción | Tipo | Rechaza si bloqueado | Rol (hoy → D7) | Revalida | Notas |
| --- | --- | --- | --- | --- | --- |
| `getOrCreateProjectPlanAction` | lectura+crea-idempotente | N/A | miembro → OWNER/STAFF | `/{t}/quotes/projects/{id}` | Idempotente vía `projectId @unique` |
| `createLookaheadTaskAction` | escritura | N/A | miembro → OWNER/STAFF | `/{t}/quotes/projects/{id}` | — |
| `createWeeklyCommitmentAction` | escritura | N/A | miembro → OWNER/STAFF | `/{t}/quotes/projects/{id}` | — |
| `updateCommitmentStatusAction` | escritura | N/A | miembro → OWNER/STAFF | `/{t}/quotes/projects/{id}` | Limpia causa/notas si no es `FAILED` |
| _handler_ `advanceWindow` | escritura (lib) | N/A | — | — | **Sin llamador** (código muerto; ver 0.4) |

### Bitácora — `field-log/actions.ts`

| Acción | Tipo | Rechaza si bloqueado | Rol (hoy → D7) | Revalida | Notas |
| --- | --- | --- | --- | --- | --- |
| `getOrCreateFieldLogAction` | lectura+crea-idempotente | N/A | miembro → OWNER/STAFF | `/{t}/quotes/projects/{id}` | Idempotente vía `projectId @unique` |
| `createFieldLogEntryAction` | escritura | N/A | miembro → OWNER/STAFF | `/{t}/quotes/projects/{id}` | `authorName`/`authorRole` **vienen del formulario** (1.6) |
| `deleteFieldLogEntryAction` | borrado | N/A | miembro → OWNER | `/{t}/quotes/projects/{id}` | Valida pertenencia de la entrada a la bitácora |

### Informes — `reports/actions.ts` (solo lectura)

| Acción | Tipo | Rechaza si bloqueado | Rol (hoy → D7) | Revalida | Notas |
| --- | --- | --- | --- | --- | --- |
| `getInformeCeroDataAction` | lectura | N/A | miembro → OWNER/STAFF | — | — |
| `getWeeklyReportDataAction` | lectura | N/A | miembro → OWNER/STAFF | — | PPC/CNC + EVM honesto (1.3) |
| `exportBomCsvAction` | lectura | N/A | miembro → OWNER/STAFF | — | CSV con BOM UTF-8 + escape antifórmula |

**Regla transversal (sección 2) aplicable a toda escritura:** sesión válida → tenant del servidor → rol D7 → cadena de pertenencia completa → rechazo si `isLocked` → validación en servidor → **una** transacción (verificar `expectedRevision`, mutar, recalcular con apu-engine, incrementar revision) → resultado tipado (`STALE_REVISION`/`LOCKED`/`FORBIDDEN`/`NOT_FOUND`/`VALIDATION`) → `revalidatePath`.

## 0.4 Hallazgos y plan de cierre

1. **`advanceWindow` sin llamador.** Definido en `lib/tenant-db.ts:2678`, no invocado desde ninguna ruta/acción. Decisión: o se conecta a una acción explícita del Tab Lean o se retira; no se deja como escritura implícita.
2. **`getOrCreate` en rutas de lectura.** `[projectId]/page.tsx` (líneas 87/89/91) ejecuta `getOrCreate` para presupuesto, plan y bitácora durante el render. Permitido **solo** si es idempotente (lo es: `projectId @unique` + relectura ante racing); se documenta y se cubre con prueba.
3. **Colisión de código `PRES`.** Quote tiene `PRES-2026-001/002/003` y ProjectBudget tiene `PRES-2026-001`. Son tablas distintas (sin conflicto a nivel BD) pero el código humano se duplica. Se unifica el generador (Etapa 1 / F) considerando el máximo entre ambas tablas, con reintento ante violación de unicidad. No se toca el dato existente.
4. **`authorName`/`authorRole` del formulario.** En `field-log`, el autor se toma del input del cliente (suplantación). Etapa 1.6: derivarlo de la sesión/usuario en el servidor.
5. **Duplicados en `report-engine.ts`.** Reformateadores y helpers de fecha replicados (`formatMoneyMicro`, `formatPercentMicro`, `isoWeekRange`, `plainDateToIso`, `parsePlainDate`) e import sin uso de `calculateBudgetTotals`. Etapa 1.4: importar de `lib/format.ts` y `lib/lean-engine.ts`.
6. **Roles (D7).** Ninguna acción valida rol hoy. Etapa 1.5: `OWNER` para `toggleBudgetLock`, `updateAiuConfig` y aprobación de línea base; `OWNER`/`STAFF` para ediciones de capítulos/partidas/recursos.
7. **Concurrencia.** Falta `ProjectBudget.revision` (`Int @default(1)`) y el `expectedRevision` en las mutaciones; `order = max+1` debe asignarse dentro de la transacción tras bloquear el presupuesto para respetar `@@unique([budgetId, order])` y `@@unique([chapterId, order])` (Etapa 1.8).
8. **Catálogo histórico (Etapa 2).** Tenant `juancarlos`: `ApuItem` 2168, `ApuActivity` 2374, `ApuActivityComposition` 19020; 0 duplicados y 0 cruces de tenant; `wastePercent` en 0 en todas; 14 unidades. Recuperar `apu-importer` (`be1d010`) y `APU_UNITS` (`e5a8eae`) con vista previa antes de importar.
9. **Baseline / Informe Cero.** Falta `BudgetBaseline` inmutable y `approveBaselineAction` (solo `OWNER`); el Informe Cero debe leer la última línea base y, si no existe, mostrar el presupuesto vivo etiquetado "Sin línea base aprobada" (Etapa 1.10).
