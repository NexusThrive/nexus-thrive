# ADR-0006 · Servicio transaccional único para el dinero

- **Estado:** Propuesta · 2026-10-22

## Contexto

Cinco caminos crean cobros con escrituras sueltas (DATA-01); el pago de facturas
puede duplicarse.

## Decisión

`lib/capabilities/money` expone `recordIncome(ctx, input)` y `recordExpense(ctx,
input)` que, en **una** transacción: crean el movimiento, asignan número,
enlazan caja abierta, ejecutan efectos (stock, estado del documento) mediante
callbacks del llamador y escriben auditoría. Los cambios de estado usan
actualizaciones condicionales (`WHERE status = …`).

## Alternativas

Corregir cada camino por separado (más rápido, se vuelve a duplicar); colas
(innecesario a esta escala).

## Consecuencias

`recordCharge`, `createPaymentAction`, `sellProductAction`, `payInvoice` y taquilla
pasan a usar el servicio; pruebas de concurrencia nuevas.
