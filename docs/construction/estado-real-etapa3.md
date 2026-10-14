# Estado real de la Etapa 3 (2026-10-14)

Sustituye a todos los informes anteriores de la Etapa 3 (marcados INVÁLIDOS).

## Lo que existe (archivo)
- Columnas `BudgetItem.wastePct`, `BudgetItem.sourceActivityId`, `BudgetItemResource.sourceItemId`, `BudgetItemResource.wastePct` en prisma/contract.prisma, con migraciones aditivas en migrations/app (20261013T2348 a 20261014T0054).
- Desperdicio del catálogo: `componentCost` y `activityUnitCost` en lib/apu-engine.ts (wastePercent en porcentaje, BigInt).
- `budgets.updateResource` en lib/tenant-db.ts: solo cambia `wastePct` de una línea y recalcula totales; NO recalcula el costo de la partida.
- `budgets.createItem`, `updateItem`, `deleteItem`, `verifyTotals`, `setLocked`, `approveBaseline` (Etapa 1).

## Lo que NO existe
- `importActivityFromCatalog`, `addItemResource`, `updateItemResource`, `deleteItemResource`, `getItemComposition`, `verifyBudgetTotals` (el nombre real es `budgets.verifyTotals`), `deleteBudgetResource`.
- Costo de línea de presupuesto con desperdicio (`budgetResourceLineCost`), `bomQuantity`, `wastePercentToFractionMicro`: se implementan en 3a-1.
- Importación de actividad del catálogo a presupuesto; nadie escribe `sourceActivityId`/`sourceItemId`.
- Editor de APU del presupuesto en la UI.
- Ninguna prueba de integración del desperdicio por línea.

## Defectos conocidos al 2026-10-14 (corregidos en 3a)
- BOM (lib/report-engine.ts) usaba `item.wastePct` (nivel partida) con división entera y `Number`.
- `recalcBudgetTotals` no refleja desperdicio de línea.
- `BudgetItem.wastePct` es un resto del diseño descartado (por partida).
- El 6.450.125 del informe anterior (5.863.750 × 1,1) no es reproducible con el código actual; hipótesis no verificada: desperdicio aplicado a toda la partida.
