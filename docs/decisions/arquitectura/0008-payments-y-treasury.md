# ADR-0008 · Payments y Treasury: obligaciones, aplicaciones, cuentas y liquidaciones

- **Estado:** Aceptada · 2026-11-06 · responsable: santy401. Concreta D-8, D-9 y D-10 de la [guía de producto](../../product/nexus-platform/README.md) §17.
- **Se apoya en:** ADR 0006 (servicio de dinero único) y ADR 0007 (soluciones sobre plataforma).

## Contexto

El dinero de Nexus tenía cuatro huecos: solo las facturas tenían saldo (pedidos y membresías no), un pago apuntaba a una sola
cosa, no existían cuentas ni comisiones de la pasarela, y la conciliación comparaba contra un reporte pegado a mano.

## Decisión

1. **Obligación = lo que se debe.** Las facturas y cuentas de cobro ya son su propia obligación (`Invoice.total`, `paidTotal`):
   **no se duplican**. Para lo que no tiene factura se crea `Obligation` (pedido de la tienda, membresía) con monto, saldo,
   vencimiento y un origen único (`originType` + `originId`). La cartera junta ambas. *(HU-obligaciones-01)*
2. **Un pago puede cubrir varias obligaciones y al revés** (D-8): tabla `PaymentAllocation` (pago, obligación, monto). Se
   conserva un solo movimiento real de dinero; la suma aplicada nunca supera el pago. `Payment.invoiceId` se conserva
   durante la transición. *(HU-aplicacion-01)*
3. **Dónde está el dinero** (D-9): `FinancialAccount` con tipo (caja, banco, pasarela). `CashBox` sigue siendo la caja física.
   *(HU-tesoreria-01)*
4. **Comisión** (D-10): estimada al confirmar (tarifa configurable por conexión) y real al liquidar, con un ajuste contable
   por la diferencia. *(HU-tesoreria-01, HU-liquidaciones-01)*
5. **Intentos y verificación:** un intento fallido es un registro propio (`PaymentAttempt`) y no crea pagos; una transferencia
   con comprobante queda «en verificación» hasta que una persona autorizada la confirme. *(HU-intentos-01, HU-verificacion-01)*
6. **Todo el dinero entra por `money-service`** (ADR 0006); nada de lo anterior lo salta.

## Alternativas

- **Convertir pedidos y membresías en facturas:** duplica el documento fiscal y reconoce ingreso antes de cobrar.
- **Partir un pago en varios `Payment`:** inventa movimientos de dinero que no existieron.
- **Extender `CashBox` con bancos y pasarelas:** mezcla la caja física con cuentas que no se cuentan en un turno.

## Consecuencias

- Migraciones solo aditivas, con su SQL de producción en `docs/prod-sql/`.
- La cartera muestra dos orígenes; los pedidos y membresías se cobran desde su pantalla, las cuentas se abonan en la cartera.
- Las reglas de capas se amplían de forma explícita (receivables importa `business/sales/obligations`).
