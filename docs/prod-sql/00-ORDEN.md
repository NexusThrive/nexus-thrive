# Orden de ejecución del SQL de producción (Supabase)

Todos los archivos son **aditivos e idempotentes**: se pueden correr en cualquier
orden y volver a correr sin romper nada. Aun así, este es el orden recomendado
(va de lo más antiguo a lo más reciente).

Ejecutar en el **SQL Editor de Supabase**, base del proyecto, uno por uno.
Cada archivo trae su propia transacción (`BEGIN`/`COMMIT`).

| # | Archivo | Qué crea | Estado |
|---|---------|----------|--------|
| 1 | `2026-10-17-ops-center-completo.sql` | Operations Center: equipo, roles, clientes, soporte, Leads, contactos, bandeja | aplicado |
| 2 | `2026-10-19-v1-negocio-completo.sql` | V1 del negocio: finanzas, caja, clientes, agenda, rubros, taquilla, Presence | aplicado |
| 3 | `2026-10-19-beneficios.sql` | Accesos: `BenefitCode`, `BenefitRedemption` + el código fijo `ELITE30` | aplicado |
| 4 | `2026-10-20-admin-santiago.sql` | Administrador (Propietario) del Operations Center (`santiprocastellar7@gmail.com`) | aplicado |
| 5 | `2026-10-20-asistencia-intentos.sql` | Control de acceso: columna `scanned` y `customerId` admite null (registrar los escaneos que no son de nadie) | **sin confirmar** |
| 6 | `2026-10-21-alta-en-panel.sql` | Alta de negocios desde el panel con invitación al dueño | **sin confirmar** |
| 7 | `2026-10-21-invitaciones-equipo.sql` | Invitaciones al equipo del negocio | **sin confirmar** |
| 8 | `2026-10-21-reinicio-de-datos.sql` | Vacía los datos de negocio (no es de esquema; solo si quieres empezar de cero) | opcional |
| 9 | `2026-10-23-restricciones-negocio-y-rls.sql` | Llaves a `Tenant` en 22 tablas, código de acceso y NFC únicos por negocio, RLS en las 71 tablas, retira `Membership.payments` | **PENDIENTE** |
| 10 | `2026-10-23-codigos-a-medida.sql` | Códigos a medida: precio, módulos y límites en `BenefitCode`; límites en `Tenant`; precio en `BenefitRedemption` (aditivo) | **PENDIENTE** |
| 11 | `2026-10-23-registro-de-capacidades.sql` | Módulos como texto validado (sin el CHECK del enum) y suite de construcción de `quotes` a `construction` (datos) | **PENDIENTE** |
| 12 | `2026-10-23-documento-comercial.sql` | Documento comercial unificado: totales, origen y cobro en `Invoice`; descuento e impuesto en `InvoiceLine` (aditivo) | **PENDIENTE** |
| 13 | `2026-10-24-api-llaves.sql` | API: llaves por negocio, registro de uso e idempotencia (`ApiKey`, `ApiRequestLog`, `IdempotencyRecord`) | generado de la migración |
| 14 | `2026-10-24-webhooks-outbox.sql` | Eventos: outbox transaccional y webhooks firmados (`OutboxEvent`, `WebhookEndpoint`, `WebhookDelivery`) | generado de la migración |
| 15 | `2026-10-24-uso-y-origen.sql` | Bitácora con origen (`actorType`, `apiKeyId`, `requestId` en `AuditLog`) y medidores de uso (`UsageCounter`) | generado de la migración |
| 16 | `2026-10-24-conexiones-externas.sql` | Conexiones con proveedores y webhooks entrantes (`ExternalConnection`, `ProviderEvent`) | generado de la migración |
| 17 | `2026-10-24-tercero-unico.sql` | Tercero único: `Party`, `PartyRole` y `Customer.partyId` (aditivo) | generado de la migración |
| 18 | `2026-10-24-tercero-unico-relleno.sql` | **Datos**: crea el tercero y el rol CLIENTE de cada cliente existente (idempotente; correr DESPUÉS del 17) | **PENDIENTE** |
| 19 | `2026-10-24-catalogo-maestro.sql` | Catálogo maestro: variantes, códigos de barras, listas de precios y clasificación fiscal en `Product` (aditivo) | generado de la migración |
| 20 | `2026-10-24-inventario-bodegas-kardex.sql` | Inventario: bodegas, existencias por bodega, kardex con costo y `Tenant.costingMethod` (aditivo) | generado de la migración |
| 20b | `2026-10-24-existencias-llave-unica.sql` | Cambia los índices parciales de `StockLevel` por una llave única normal (`variantKey`); la tabla es nueva y está vacía (DESPUÉS del 20) | generado de la migración |
| 21 | `2026-10-24-inventario-relleno.sql` | **Datos**: bodega «Principal» y existencias iniciales por producto (idempotente; DESPUÉS del 20) | **PENDIENTE** |
| 22 | `2026-10-24-compras-y-proveedores.sql` | Compras: `PurchaseOrder`, `PurchaseOrderLine` y `SupplierInvoice` (aditivo; requiere los pasos 17 y 20) | generado de la migración |
| 23 | `2026-10-24-perfil-general.sql` | Perfil general: valor `general` del rubro (restricción), `Tenant.businessModels` y `Tenant.activity` (aditivo) | generado de la migración |
| 24 | `2026-10-24-traslados-conteos-reposicion.sql` | Traslados entre bodegas, conteos físicos y `Product.maxStock/reorderPoint` (aditivo; requiere los pasos 20 y 22) | generado de la migración |
| 25 | `2026-10-24-impuestos-y-numeracion.sql` | `TaxRate` y `NumberingResolution` (impuestos con vigencia y numeración por resolución) y en `Invoice`: `resolutionId`, `prefix`, `withholdingTotal`, `withholdings` (aditivo) | generado de la migración |
| 26 | `2026-10-24-cartera.sql` | Cartera: `Invoice.paidTotal`, `SupplierInvoice.paidTotal` y la tabla `SupplierPayment` (aditivo; requiere los pasos 22 y 25) | generado de la migración |
| 27 | `2026-10-24-pos-terminales.sql` | Punto de venta: tabla `PosTerminal`, `CashSession.terminalId` e `Invoice.tipTotal` (aditivo; requiere los pasos 25 y 26) | generado de la migración |
| 28 | `2026-10-24-pagos-cobros-en-linea.sql` | Cobros en línea: `PaymentIntent`, `PaymentRefund` y `ReconciliationRun` (aditivo; requiere los pasos 26 y 27) | generado de la migración |
| 29 | `2026-10-24-facturacion-electronica.sql` | Facturación electrónica: tabla `FiscalDocument` y `Tenant.einvoiceEnabled` (aditivo; requiere el paso 28) | generado de la migración |
| 30 | `2026-10-24-contabilidad-plan-y-periodos.sql` | Contabilidad I: `Account` (PUC), `AccountingPeriod`, `AccountingRule` y `CostCenter` (aditivo) | generado de la migración |
| 31 | `2026-10-24-contabilidad-asientos.sql` | Contabilidad II: `JournalEntry`, `JournalLine` y `Tenant.accountingEnabled` (aditivo; requiere el paso 30) | generado de la migración |
| 32 | `2026-10-24-presencia-v2.sql` | Presencia v2: tabla `PresenceSnapshot` (foto diaria para la tendencia; aditivo) | generado de la migración |
| 33 | `2026-10-24-mini-sitio.sql` | Mini-sitio: tabla `SiteConfig` (aditivo) | generado de la migración |
| 34 | `2026-10-24-tienda-en-linea.sql` | Tienda en línea: `StoreOrder` y `StoreOrderLine` (aditivo; requiere los pasos 28 y 33) | generado de la migración |

## Estado: producción reconstruida desde las migraciones (camino A, 2026-10-23)

Producción quedó con 71 tablas, RLS en todas, los 5 roles del panel y
`santiagocastellar201022@gmail.com` como Propietario. **Los archivos de esta
carpeta ya no se corren**: los cambios de esquema llegan con
`pnpm exec prisma db migrate --db <producción>` antes de mergear. Se conservan
como historial.

## Los dos caminos (referencia)

Producción todavía no tiene datos que conservar, así que hay dos caminos. El
**A** acaba con el problema de raíz (DATA-03: dos fuentes del esquema).

### A · Reconstruir producción desde las migraciones (recomendado)

Deja producción con exactamente el mismo esquema que el CI prueba en cada PR.
Borra todas las tablas de `public`.

En tu terminal, desde `nexus-thrive/` (pide datos, así que no va con `!`):

```bash
OWNER_EMAIL=<tu-correo> bash scripts/rebuild-db.sh
```

Te pide la cadena de conexión (no se ve al pegarla) y después el nombre de
la base para confirmar.

- `TARGET_DATABASE_URL`: Supabase → *Project Settings* → *Database* →
  *Connection string* (la directa o el *session pooler*, puerto 5432).
- El script pide escribir el nombre de la base antes de borrar.
- Siembra los 5 roles del panel y te deja como Propietario por correo; tu
  cuenta de Clerk se vincula sola al entrar con ese correo verificado.
- Después, los archivos de esta carpeta ya no se corren: los cambios de
  esquema llegan por las migraciones (`pnpm exec prisma db migrate --db …`).

### B · Seguir con el SQL manual

Corre los archivos **5, 6, 7 y 9** en ese orden (son idempotentes: si alguno
ya estaba aplicado, no pasa nada). El 9 va **antes** de desplegar la versión
que lo trae.

> Mientras se use el camino B, `scripts/check-prod-sql.sh` (en el CI de cada
> PR) exige que un cambio del modelo de datos traiga su archivo aquí.

---

## Comprobación rápida (después de correrlos)

```sql
-- Debe salir 1 fila: tu correo, con el rol owner y 25 permisos.
SELECT m."email", m."clerkUserId", m."active", r."key", r."name",
       array_length(r."permissions", 1) AS permisos
  FROM "public"."StaffMember" m
  JOIN "public"."StaffRole" r ON r."id" = m."roleId"
 WHERE m."email" = 'santiprocastellar7@gmail.com';

-- Debe salir 1 fila: el código del QR impreso.
SELECT "code", "kind", "active", "plan", "durationDays" FROM "public"."BenefitCode";
```

---

## Cosas que se corrigen desde el panel (sin SQL)

- **Activar el QR fijo**: en *Accesos* (`/admin/beneficios`), el código `ELITE30`
  se puede **pausar/activar** y editar (plan, días, usos, vencimiento). El
  código en sí nunca cambia (las tarjetas ya impresas apuntan a él).
- **Emitir accesos pagados**: desde *Accesos*, botón *Emitir acceso pagado*
  (plan + días + cliente). Se entrega el código al cliente.
