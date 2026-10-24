# SQL de diseño por PR

Borradores del esquema que necesita cada PR de
[`../hoja-de-ruta-implementacion.md`](../hoja-de-ruta-implementacion.md), en el
orden de construcción (de lo más básico a lo más avanzado).

> **No se corren.** Producción ya se reconstruye con migraciones
> (`prisma db migrate`; los `docs/prod-sql/*.sql` son historia). Estos archivos
> fijan **qué tablas, columnas, llaves e índices** debe producir la edición de
> `prisma/contract.prisma`; la migración real la genera `prisma migration plan`
> y se aplica con `prisma db migrate` (ver «Cómo se migra» en la hoja de ruta).

Convenciones (las del esquema actual):

- `id text` (uuid generado por la aplicación), fechas `timestamptz`, dinero
  `numeric`; sin enums de base (texto + validación en código + `CHECK` donde
  el conjunto es cerrado).
- Todo con `"tenantId"` → `Tenant(id) ON DELETE CASCADE` y **RLS activada**.
- Cambios **aditivos** (columnas con valor por defecto, tablas nuevas) y
  rellenos idempotentes; nada que rompa lo que ya corre.
- Los nombres de índices de la migración real los fija la herramienta.

| PR | Archivo | Qué crea |
| --- | --- | --- |
| 02 | `PR-02-api-llaves.sql` | `ApiKey`, `ApiRequestLog`, `IdempotencyRecord` |
| 03 | `PR-03-outbox-webhooks.sql` | `OutboxEvent`, `WebhookEndpoint`, `WebhookDelivery` |
| 05 | `PR-05-uso-y-origen.sql` | `UsageCounter`; origen en `AuditLog` |
| 06 | `PR-06-conexiones-externas.sql` | `ExternalConnection`, `ProviderEvent` |
| 08 | `PR-08-terceros.sql` | `Party`, `PartyRole`; `Customer.partyId` |
| 09 | `PR-09-catalogo-maestro.sql` | `ProductVariant`, `ProductBarcode`, `PriceList`, `PriceListItem`; datos fiscales en `Product` |
| 10 | `PR-10-inventario-bodegas-kardex.sql` | `Warehouse`, `StockLevel`; costo y saldo en `StockMovement` |
| 11 | `PR-11-traslados-conteos-compras.sql` | Traslados, conteos, órdenes de compra, factura de proveedor |
| 13 | `PR-13-impuestos-y-numeracion.sql` | `TaxRate`, `DocumentSequence`; estado fiscal en `Invoice` |
| 14 | `PR-14-cartera.sql` | `Receivable`, `PaymentApplication`, `Payable`, `CollectionReminder` |
| 15 | `PR-15-pos-terminales-turnos.sql` | `PosTerminal`, `PosHeldSale`; terminal y cajero en caja y documentos |
| 17 | `PR-17-pagos-intenciones-conciliacion.sql` | `PaymentIntent`, `PaymentRefund`, `Reconciliation`(+Item) |
| 18 | `PR-18-facturacion-electronica.sql` | `EInvoiceDocument`, `EInvoiceAttempt`, `EInvoiceEvent` |
| 21 | `PR-21-contabilidad-plan-y-periodos.sql` | `Account`, `CostCenter`, `AccountingPeriod`, `PostingRule` |
| 22 | `PR-22-contabilidad-asientos.sql` | `JournalEntry`, `JournalLine` + partida doble en la base |
| 24 | `PR-24-presencia-v2.sql` | `PresenceSnapshot`, `TenantPresenceState` |
| 25 | `PR-25-sitio-y-catalogo-publico.sql` | `Storefront`, `StorefrontPage` |
| 26 | `PR-26-tienda-carrito-y-envios.sql` | `Cart`, `CartLine`, `ShippingRate` |
| 28 | `PR-28-reputacion-y-atribucion.sql` | `SurveyResponse`, `Review`, `ShortLink`, `AttributionTouch` |

Los PR que no aparecen (01, 04, 07, 12, 16, 19, 20, 23, 27, 29, 30) **no
necesitan tablas nuevas**: son código, adaptadores o configuración.
