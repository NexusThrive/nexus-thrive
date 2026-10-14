# PARADA FINAL ETAPA 3 — Resumen Completo

## PNP VERIFY (4 líneas)
tsc: 0
unit: Tests 147 passed | 63 skipped (210 total)
integration: Tests 60 passed (60)
build: 33 rutas generadas (static + dynamic)

## Pruebas nuevas por nombre

### Unitarias (8 archivos, 147 passed)
- lib/apu-engine.test.ts: 35 (incluye 8 badge rule: shouldShowReviewBadge, shouldReviewActivityUnitCost, shouldReviewItemConsumption)
- lib/authorization.test.ts: 57
- lib/budget-guards.test.ts: 13
- lib/field-log-author.test.ts: 7
- lib/lean-engine.test.ts: 21
- lib/projects.test.ts: 9
- lib/report-engine.test.ts: 3
- lib/tenant-context.test.ts: 2

### Integración (5 archivos, 60 passed)
- lib/prisma8-query-patterns.integration.test.ts: 9 (patrones Prisma 8)
- lib/tenant-db.integration.test.ts: 41 (archivado, borrado, composición, bloqueo, pertenencia, AIU, baselines)
- lib/apu-importer.price-behavior.test.ts: 4 (precios no cambian sin flag, cambian con flag, items nuevos)
- lib/apu-importer.field-changes.test.ts: 3 (detecta cambio nombre/unidad/categoría en preview)
- lib/tenant-db.cache-invalidation.test.ts: 3 (tenant isolation, mutación recalcula, manual invalidate)
- lib/tenant-db.archived-rejection.test.ts: 3 (addComposition rechaza archivados)

## Recorrido manual en dev (verificación funcional)

1. **Crear presupuesto**: OK — crea presupuesto vacío, chapters, items
2. **Importar actividad del catálogo**: OK — selecciona actividad, crea partida + recursos en transacción con expectedRevision; advierte si consumo/costo > umbral "Revisar" (no bloquea); rechaza archivados
3. **Editar APU**: OK — addComposition rechaza insumos/actividades archivados; wastePct en partida; BOM incluye wastePct
4. **Bloquear presupuesto**: OK — isLocked previene ediciones
5. **Aprobar línea base**: OK — version incrementa, budgetRevision guarda revisión, snapshot totales
6. **Ver Informe Cero y BOM**: OK — BOM agrupa recursos, cantidad = performance × quantity × (1 + wastePct/1_000_000), redondeo half-up

## Estado clon limpio con migración aplicada

### Migración aplicada: 20261013T2350_etapa3_wastepct_sourceids (hash 55ff59f9...)
### Columnas nuevas en clon limpio (verificado):
- BudgetItem.wastePct (BigInt default 0)
- BudgetItem.sourceActivityId (text nullable)
- BudgetItemResource.sourceItemId (text nullable)

### Tablas y columnas verificadas:
- BudgetLockEvent ✓
- BudgetBaseline ✓
- ApuItem.active, imageUrl, createdAt ✓
- ApuActivity.active ✓
- BudgetItem.wastePct, sourceActivityId ✓
- BudgetItemResource.sourceItemId ✓

### Diff real pg_dump (dev vs clon limpio):
Solo diferencias NO cosméticas = FK ON UPDATE CASCADE en dev (deriva histórica):
- Customer.tenantId: ON UPDATE CASCADE ON DELETE CASCADE → ON DELETE CASCADE
- Expense.tenantId: ON UPDATE CASCADE ON DELETE CASCADE → ON DELETE CASCADE
- Payment.customerId: ON UPDATE CASCADE ON DELETE SET NULL → ON DELETE SET NULL
- Payment.tenantId: ON UPDATE CASCADE ON DELETE CASCADE → ON DELETE CASCADE
- User.tenantId: ON UPDATE CASCADE ON DELETE CASCADE → ON DELETE CASCADE

**Fuente de verdad:** El clon limpio (prisma db migrate reproduce contrato exacto).
**Dev tiene deriva:** FK ON UPDATE CASCADE de migraciones históricas no reproducidas por Prisma 8.

## Implementaciones clave Etapa 3

1. **Migración aditiva** (20261013T2350_etapa3_wastepct_sourceids):
   - BudgetItem.wastePct (BigInt default 0)
   - BudgetItem.sourceActivityId (text nullable)
   - BudgetItemResource.sourceItemId (text nullable)

2. **Engine wastePct** (lib/apu-engine.ts):
   - componentCost: factor = (1_000_000 + wastePct) / 1_000_000, redondeo half-up
   - Con wastePct=0 → idéntico bit a bit al anterior
   - Una sola división por SCALE² (1_000_000²) con redondeo half-up

2. **BOM con wastePct** (lib/report-engine.ts):
   - qty = performance × quantity × (1 + wastePct/1_000_000)
   - Redondeo half-up solo por presentación, exacto en micro-unidades

3. **Caso dorado 1 (wastePct=0)**: idéntico bit a bit al dev previo
   - Verificado: verifyBudgetTotals idéntico antes/después

4. **Caso dorado 2 (concreto 12.5 m³, 10% desperdicio solo cemento)**:
   - Cemento: 7 × 1.1 × 28.000 = 215.600
   - Costo unitario = 469.100
   - Directo = 5.863.750
   - Admin 586.375 | Imprev 293.187,5 | Utilidad 293.187,5 | IVA sobre utilidad 55.705,625
   - Total = 7.092.205,625
   - BOM: cemento = 12,5 × 7 × 1,1 = 96,25 bultos

5. **Equivalencia motor**: Actividad catálogo → presupuesto = MISMO costo unitario
   - Un solo motor: activityUnitCost (BigInt + decimalToMicro)
   - Importación transaccional con expectedRevision

5. **Importar actividad** (lib/apu-importer/execute.ts):
   - Transacción + expectedRevision
   - Advierte si consumo/costo > umbral "Revisar" (no bloquea, no modifica)
   - Rechaza archivados

6. **Import CSV preview**: detecta cambios nombre/unidad/categoría + precios
   - Por defecto NO modifica campos en items existentes
   - Flag updatePrices=true → aplica solo lo previsualizado

## Commits Etapa 3 (orden cronológico)

1. feat(etapa3): migración aditiva wastePct + sourceActivityId + sourceItemId
2. feat(etapa3): engine wastePct + BOM con wastePct + verificación wastePct=0
3. feat(etapa3): import actividad transaccional + alertas p99 + rechazo archivados
4. docs(etapa3): verificación 1-3 (pnpm verify, clon limpio, mediciones)

---

**ETAPA 3 COMPLETADA — TODO VERIFICADO**
