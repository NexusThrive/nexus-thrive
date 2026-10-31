# Informe: cambio de fechas UTC → Bogotá (PR 2)

Fecha: 2026-10-31. Alcance: el único cambio de comportamiento de la pila de PR. Commit `acebe5f` (rama `pr/02-dependencias-e2-e9`), más el SQL de diagnóstico `724229b`/`0cbcdca`. **No se aprueba solo porque `pnpm verify` esté en verde**: este informe separa lo que se comprobó de lo que queda por decidir.

## 1. Qué cambió

Antes, tres puntos de `documents-db.ts` fechaban con `String(issueDate).slice(0, 10)`, es decir, el **día UTC** del instante. Entre las 19:00 y las 24:00 de Bogotá (UTC−5) ese día es el siguiente. Ahora usan `bogotaDay(instante)` (`lib/foundation/dates/plain-date.ts`), que devuelve el día de calendario de `America/Bogota`.

| Dato | Dónde | Antes | Ahora |
|---|---|---|---|
| Fecha del asiento contable de un documento | `lib/business/sales/documents-db.ts` (`postByRule`, `date:`) | día UTC | **día Bogotá** |
| Fecha del documento fiscal en cola | ídem (`enqueue`, `issueDate:`) | día UTC | **día Bogotá** |
| Fecha mostrada en la vista del documento | ídem (`documentView`) | día UTC | **día Bogotá** |
| Fecha de la lista de recibos y cuentas de cobro | `lib/business/sales/invoices-db.ts` | día UTC | **día Bogotá** (igual que el detalle) |
| Numeración y retenciones del mismo documento | ídem (`todayCO`) | día Bogotá | sin cambio |

Además `toJsDate` entiende `Temporal.Instant` (antes lo trataba como inválido y `bogotaToday` devolvía «hoy» en silencio). Sin cambios en Prisma, migraciones ni tablas.

**Cuándo difiere.** Las fechas escritas a mano en la interfaz se guardan a las 12:00 UTC (07:00 de Bogotá): para ellas el resultado **no cambia**. Solo cambia cuando la fecha es `now()` y la hora de Bogotá está entre las 19:00 y las 24:00.

## 2. Qué pasa con los documentos antiguos

**Nada: no se migra ni se corrige ningún registro.**

- Los asientos y documentos fiscales ya creados entre las 19:00 y las 24:00 de Bogotá conservan la fecha del día siguiente. A partir del cambio conviven asientos «viejos» (día UTC) y «nuevos» (día Bogotá) en el mismo libro.
- No se propone un `UPDATE`: el libro contable es encadenado (cada asiento guarda un hash que incluye su fecha) y los documentos fiscales aceptados por el proveedor no se pueden reescribir.
- Se añadió `docs/diagnostico/2026-10-31-fechas-utc-documentos.sql`: solo `SELECT`, dentro de `BEGIN READ ONLY … ROLLBACK`, con una columna `tratamiento_sugerido`. **Nunca se ejecutó contra producción** ni contra una copia: el número real de casos afectados se desconoce.
- Una prueba (`0cbcdca`) comprueba que el SQL rechaza escrituras y solo corre en la base desechable.

## 3. Consumidores de la fecha del documento (revisión de `lib/` y `app/`)

| Consumidor | Cómo obtiene el día | ¿Consistente con el cambio? |
|---|---|---|
| Vista del documento y lista de recibos | `bogotaDay` | **Sí** (ahora coinciden) |
| `salesOfDay` (ventas del día) | Ventana `05:00Z`–`05:00Z` del día de Bogotá sobre `issueDate` | **Sí**: ya usaba Bogotá; ahora el asiento y el reporte de ventas coinciden por la noche |
| Numeración y retenciones | `todayCO` | **Sí** |
| Reportes contables (auxiliar, libro mayor) | Fecha del **asiento** (`date`) | Mixta para el histórico: los asientos nuevos llevan el día Bogotá, los antiguos el UTC. Es la causa por la que `accounting/reports.integration` fallaba de noche; ahora pasa |
| Cierre mensual contable | Mes de la fecha del asiento; escribir en un mes cerrado falla y deshace el hecho (`ledger-db.ts`) | Un documento emitido la última noche del mes ahora cae en **su** mes (antes caía en el siguiente). No se probó con un mes cerrado real |
| Recibo del punto de venta (`pos-db.ts:155`) | `String(doc.issueDate).slice(0, 16)` → fecha y hora en **UTC** | **No consistente**: sigue mostrando UTC. No lo toca este PR |
| Documento soporte de compras (`einvoice-db.ts:170`) | `String(inv.issueDate).slice(0, 10)` sobre la factura **del proveedor** | Sin cambio de resultado: esa fecha la escribe una persona y se guarda a las 12:00 UTC |
| Devoluciones (`returns-db.ts:32`) | `issuedAt: String(sale.issueDate)` (instante completo) | Sin día recortado; no afectado |
| Exportaciones y otros `toISOString().slice(0, 10)` (`data-exchange/table.ts`, calendarios) | UTC de fechas sin hora o de agenda | Fuera de este cambio; no son fechas de documentos |

## 4. Pruebas que lo respaldan

- 13 casos unitarios de `bogotaDay`: medianoche, cambio de mes, de año, bisiesto, `Temporal.Instant`.
- 9 de integración con instantes fijos (asiento, documento fiscal, vista y lista); con el código anterior fallan 6 de 9.
- La prueba que fallaba solo de noche (`accounting/reports.integration`) vuelve a pasar a cualquier hora.

## 5. Lo que NO se ha comprobado

1. Cuántos documentos reales están afectados (el SQL de diagnóstico no se ha corrido).
2. El efecto sobre un mes ya cerrado en una base real.
3. Si algún proceso externo (contador, proveedor fiscal) ya concilió con las fechas UTC.
4. Qué fecha esperan los clientes que reciben el documento fiscal de la franja nocturna.

## 6. Recomendación

- **Separar este cambio en su propio PR.** Hoy viaja dentro de la pila de 29 commits del PR 2 junto a refactors mecánicos. Para aprobarlo con criterio conviene aislar `acebe5f`, `724229b` y `0cbcdca` (+ la documentación `da534e8`), que no dependen de los movimientos de E2.
- Antes de fusionar: ejecutar el diagnóstico contra una **copia** y decidir con contabilidad cómo tratar el histórico.
- Decidir si el recibo del POS (`pos-db.ts:155`) debe mostrar la hora de Bogotá; hoy sería la única vista que sigue en UTC.
