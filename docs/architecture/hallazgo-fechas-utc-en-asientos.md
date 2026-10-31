# Hallazgo: documentos comerciales fechados en UTC

**Estado: corregido en el código** (commit `dbe79e3`, PR independiente de fechas). **Registros históricos: solo diagnóstico, sin ninguna corrección.**

## Síntoma

`lib/accounting/reports.integration.test.ts` («auxiliar por tercero y libro mayor traen al tercero; el rango de fechas filtra») falla con
`expected 2 to be 5` **solo entre las 19:00 y las 24:00 hora de Bogotá** (00:00 a 05:00 UTC). Pasa el resto del día.

## Evidencia

- Falla igual en el código **anterior a E2** (`b709905`), en la misma hora y con la misma base de datos: no lo introdujo ninguna reorganización.
- Comparación completa de la integración, a la misma hora: antes de E2, 343 pruebas con **1 fallo**; después, 350 con **el mismo único fallo**.
- Pasó en las ejecuciones de E1 (17:00–18:00 de Bogotá) y falla desde que el reloj de Bogotá pasó de las 19:00 el 30 de octubre.

## Causa

`lib/business/documents-db.ts` fecha el asiento contable con el instante UTC del documento, mientras que el resto del código usa el día de Bogotá (`todayCO`):

| Línea | Código | Qué fecha produce |
|---|---|---|
| 116 | `date: String(issueDate).slice(0, 10)` (asiento contable) | día **UTC** |
| 118 | `issueDate: String(issueDate).slice(0, 10)` (cola de facturación electrónica) | día **UTC** |
| 316 | `issueDate: String(inv.issueDate).slice(0, 10)` | día **UTC** |
| 61 y 66 | `todayCO(issueDate.epochMilliseconds)` (numeración y retenciones) | día de **Bogotá** |

Dentro de la misma función conviven las dos fechas. Los cobros (`money-service`), el costo de venta (`stock-service`), los pagos a proveedores y los reversos ya usan `todayCO()`.

## Impacto

- Una factura o documento emitido entre las 19:00 y las 24:00 de Bogotá queda en el libro contable (y en la cola fiscal) con **la fecha del día siguiente**. Eso desplaza ventas al mes siguiente si ocurre el último día del mes, y descuadra los informes por rango.
- El **CI** (que ejecuta `pnpm test:integration`) se pondrá rojo en esa franja horaria aunque el código esté bien.

## Semántica de cada fecha

Las tres son **el día de negocio en Colombia**: la fecha del asiento contable, la fecha del documento fiscal que se envía al proveedor y la que se muestra al usuario.
Las fechas escritas a mano en la interfaz se guardan a las 12:00 UTC (07:00 de Bogotá), así que para ellas el día UTC y el de Bogotá coinciden; solo difieren
cuando no hay fecha explícita y se usa `now()`, que es el caso nocturno del defecto.

## Corrección aplicada

- `lib/plain-date.ts` (Foundation) gana `bogotaDay(instante)`, que devuelve `"YYYY-MM-DD"` en `America/Bogota`. Además `toJsDate` ahora entiende `Temporal.Instant`: antes lo
  trataba como inválido y `bogotaToday` devolvía «hoy» en silencio, una trampa para quien le pasara un instante persistido.
- `documents-db.ts` usa `bogotaDay` en las líneas 116 (asiento), 118 (documento fiscal) y 316 (vista).
- `invoices-db.ts` usa `bogotaDay` para el `issueDate` de la lista. No estaba entre los tres puntos, pero muestra el mismo dato: sin este cambio, la lista y el detalle del mismo
  documento mostrarían días distintos por la noche.
- Sin cambios en el contrato Prisma, las migraciones ni las tablas.

## Pruebas (deterministas)

Instantes fijos, sin depender de la hora de ejecución: `tests/unit/plain-date.test.ts` (medianoche, cambio de mes, cambio de año, bisiesto, `Temporal.Instant`) y
`tests/integration/business/documentos-fecha-bogota.integration.test.ts` (asiento, documento fiscal, vista y lista en siete instantes límite). Con el código anterior fallan 6 de 9.
`accounting/reports.integration`, que fallaba entre las 19:00 y las 24:00 de Bogotá, vuelve a pasar a esa hora.

## Otros usos de `slice(0, 10)` revisados (no modificados)

| Lugar | Qué fecha es | Por qué no se tocó |
|---|---|---|
| `documents-db.ts:317`, `invoices-db.ts` y `receivables-db.ts` (`dueDate`) | Vencimiento | Si se escribe a mano se guarda a las 12:00 UTC, igual que `issueDate`; el día UTC coincide con el de Bogotá |
| `einvoice-db.ts:165` (documento soporte) | Fecha de la factura del proveedor | Es un texto `YYYY-MM-DD` ingresado por el usuario, no un instante |
| `purchases-db.ts` (asiento de compras) | Fecha de la factura del proveedor | Mismo caso: texto `YYYY-MM-DD` |
| `tax.ts` y `tax-db.ts` | Vigencia de tarifas | Fechas sin hora |
| `construction/progress.ts` | Día de avance | Ya resta 5 horas: usa el día de Bogotá |
| `lib/ops/*`, `lib/calendar.ts`, `lib/business/calendar.ts` | Calendarios y facturación de la plataforma | No son documentos comerciales; no se encontró evidencia de este defecto |

## Registros históricos

Los asientos escritos antes de la corrección entre las 19:00 y las 24:00 de Bogotá conservan la fecha del día siguiente. **No se corrigen aquí.**
El libro contable es encadenado (cada asiento incluye su fecha en el hash) y los documentos fiscales aceptados no se pueden reescribir, así que el tratamiento de cada caso lo decide la
contabilidad. Para eso existe [`docs/diagnostico/2026-10-31-fechas-utc-documentos.sql`](../diagnostico/2026-10-31-fechas-utc-documentos.sql):

- Es de **solo lectura** (`BEGIN READ ONLY … ROLLBACK`, sin ninguna escritura) y no está en `docs/prod-sql/`, así que no se confunde con una migración.
- Lista cada caso con su fecha de origen (UTC y Bogotá) y la almacenada, el desfase en días, si cruza mes o año, el estado del período contable de ambos meses,
  el estado del documento y del documento fiscal, una clasificación (`AFECTADO_POR_DIA_UTC` o `REVISAR_OTRA_CAUSA`) y un tratamiento sugerido por caso.
- Se probó solo contra la base desechable con datos simulados (6 casos: mismo mes, cruce de mes con período cerrado, cruce de año, anulado, fiscal aceptado y otra causa).
  **No se ejecutó contra ninguna base real.**

## Estado de la validación (honesto)

Este cambio es **funcional** y viaja en su propio PR, separado de la reorganización de `lib/`. Lo que está comprobado y lo que no:

| Comprobado | No comprobado |
|---|---|
| 13 casos unitarios de `bogotaDay` y 9 de integración con instantes fijos (fallan 6 de 9 con el código anterior) | **Cuántos documentos reales están afectados**: el SQL de diagnóstico nunca se ejecutó, ni siquiera contra una copia |
| `accounting/reports.integration` pasa a cualquier hora | Efecto en un mes contable ya cerrado de una base real |
| El SQL de diagnóstico rechaza escrituras (`BEGIN READ ONLY`) | Si un contador o el proveedor fiscal ya concilió con las fechas UTC |

No se corrigen fechas históricas automáticamente ni se propone un `UPDATE`. Hasta conocer el número de casos reales **no debe darse por completamente validado**.

## Recibo del punto de venta (revisado, NO corregido)

`lib/business/pos/pos-db.ts` (`receiptOf`) arma la fecha del tiquete con `String(doc.issueDate).slice(0, 16).replace("T", " ")`. `issueDate` es un instante UTC, así que el tiquete impreso (`receipt.ts`, centrado bajo el código) muestra **fecha y hora en UTC**: una venta hecha a las 19:30 en Bogotá se imprime como `…-día siguiente 00:30`. Es la misma clase de defecto (UTC en lugar del día de negocio), pero **más visible**: lo ve el cliente final en el papel. No se incluyó en este PR para no ampliar el cambio funcional sin decisión; necesita su propia prueba (formato `YYYY-MM-DD HH:mm` en `America/Bogota`) y que producto confirme el formato.
