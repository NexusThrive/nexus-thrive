# Propuesta · Bloque B pasos 3 a 7 y A.3

[← Índice](README.md) · **Diseño propuesto, sin implementar** (2026-10-23).
Parte de lo que ya existe tras los PR del 2026-10-23: repositorios de `lib/`
con `tenantId` (A.1–A.2), registro de capacidades (paso 1), documento
comercial unificado en `Invoice` (paso 2: venta al cobrar, nota crédito al
anular, conversión cotización → pedido → cuenta de cobro, `salesOfDay`).

Reglas que se mantienen en todo: el negocio y el usuario los resuelve el
servidor; el dinero solo por `money-service.ts`; todo lo sensible a la
bitácora; cada consulta con `tenantId` (`lib/tenant/tenant-scope.test.ts`);
nada de `app/` toca la base.

---

## Paso 2 · Lo que falta para cerrarlo

| Pieza | Propuesta |
|---|---|
| Pantalla "Documentos" | Capacidad `quotes` pasa a `READY` con pantallas: lista por tipo (cotizaciones, pedidos, ventas, notas crédito), detalle imprimible y "Convertir en…" (`convertDocument`). Formularios con `FormDrawer` (líneas con descuento e IVA) |
| Informe del día | El Inicio y Finanzas leen `salesOfDay` (documentos) en vez de sumar `Payment`; una prueba compara ambos durante un tiempo para detectar diferencias |
| Numeración | Hoy máximo + 1 con reintento por la restricción única. Si hay carga real, tabla `DocumentSequence(tenantId, kind, next)` con `UPDATE … RETURNING` |
| Resoluciones DIAN | Campos de prefijo y rango autorizado por tipo cuando llegue el paso 6 |

## Paso 3 · Cartera

**Objetivo:** abonos y pagos parciales sobre un documento y cuentas por cobrar
por antigüedad.

| Pieza | Diseño |
|---|---|
| Modelo | `Invoice.balance` (saldo) y `Invoice.status` con `PARTIAL`. `Payment.invoiceId` ya existe: un documento puede tener varios cobros |
| Servicio | `money-service.applyPayment(tenantId, invoiceId, amount, method)`: en una transacción, bloquea el documento (`UPDATE … SET balance = balance - $1 WHERE balance >= $1 RETURNING`), registra el cobro con `recordIncome` y deja `PAID` al llegar a cero. Sin sobrepagos; doble clic no cobra dos veces |
| Antigüedad | Repositorio `receivablesAging(tenantId, day)`: saldos por 0–30, 31–60, 61–90, +90 días desde `dueDate` (o `issueDate`) |
| Recordatorios | Plantilla de WhatsApp por documento vencido (patrón de `whatsapp-reminder.tsx`), preparada, nunca enviada sola |
| Pruebas | Integración: abonos concurrentes que suman más que el saldo → solo pasan los que caben; antigüedad con fechas fijas |

## Paso 4 · POS de varias líneas

| Pieza | Diseño |
|---|---|
| Servicio | `money-service.sellCart(tenantId, { lines, payments[] })`: valida y descuenta stock de cada línea (`takeStock`), un documento `SALE` con todas las líneas (descuento e IVA por línea, ya soportados) y uno o varios cobros (pago mixto) cuya suma = total del documento |
| Pantalla | Página dedicada (es un flujo largo): carrito, búsqueda por nombre o código de barras (el lector funciona como teclado), cliente opcional, cobro dividido |
| Caja | Cada cobro en efectivo entra al turno abierto, como hoy |
| Pruebas | Dos ventas simultáneas de la última unidad (ya existe el patrón); pago mixto que no suma el total → rechazo |

## Paso 5 · Datos fiscales del cliente e importar/exportar

| Pieza | Diseño |
|---|---|
| Tercero mínimo | `Customer`: `documentType` (CC, CE, NIT, PP, TI), `documentNumber`, `nitDv` (dígito de verificación calculado y validado), `taxRegime`, `isCompany`, `legalName`. Validación pura con pruebas (DV de la DIAN) |
| Importar | Clientes y catálogo desde CSV/Excel (`xlsx` ya está): vista previa con errores por fila, nada se escribe hasta confirmar, todo en una transacción; reutilizar el patrón del importador APU (`lib/construction/apu-importer`) |
| Exportar | CSV de clientes, catálogo y documentos por rango de fechas (contador) |
| Límites | La importación respeta `maxCustomers` del código a medida |

## Paso 6 · Factura electrónica y Nequi

| Pieza | Diseño |
|---|---|
| Puerto DIAN | `EInvoicePort` (`lib/integrations/einvoice/`): `send(document)`, `status(id)`, `creditNote(document)`. Un adaptador por proveedor tecnológico; NEXUS no firma XML. Estado en `Invoice.einvoiceStatus`, `cufe`, `einvoiceProviderId` |
| Nequi | `PaymentGatewayPort` + tabla `PaymentIntent(tenantId, invoiceId, amount, status, providerRef)`. Solo con el estado oficial (webhook firmado o consulta) se llama a `applyPayment`. `Payment.providerRefId` único ya evita dobles |
| **Pendiente de terceros** | Elegir proveedor DIAN y obtener credenciales; habilitación y certificación de Nequi Negocios. **No hay claves en el repo**: van en variables de entorno y en `ExternalConnection` cifrada |

## Paso 7 · Eventos → API → agente → n8n y WhatsApp

Orden: eventos (outbox) → A.3 (API) → agente de consulta → n8n y WhatsApp →
acciones con aprobación.

| Pieza | Diseño |
|---|---|
| Outbox | `OutboxEvent(tenantId, type, payload, createdAt, deliveredAt)`, escrito **en la misma transacción** que el hecho (p. ej. `document.issued` dentro de `insertDocument`, `payment.voided` en `voidPayment`). Un trabajo lo entrega a n8n con firma HMAC |
| Agente de consulta | Solo lectura sobre la API: "ventas de hoy" = `salesOfDay`; responde con datos devueltos, nunca calcula |
| WhatsApp | Número vinculado a un negocio, teléfono del integrante verificado; plantillas aprobadas por Meta (**pendiente de terceros**) |
| Acciones con aprobación | `AgentAction` (borrador → aprobada / rechazada → ejecutada) con bandeja en el negocio; ejecutar llama al mismo servicio que la pantalla |

## A.3 · API `/api/v1`, MCP, n8n y agente sobre los mismos repositorios

| Pieza | Diseño |
|---|---|
| Llaves | Tabla `ApiKey(tenantId, hash, prefix, scopes[], createdById, expiresAt, lastUsedAt, revokedAt)`. Se muestra una vez; se guarda solo el hash. Alcances = permisos de `BUSINESS_PERMISSIONS` |
| Contexto | `requireApiContext(request, scope)` → `{ tenantId, actor: "api:<prefix>", scopes }`: el negocio sale de la llave, **nunca** del cuerpo o la URL. Cada handler llama a los mismos repositorios que las acciones (`customerOptions`, `salesOfDay`, `listProducts`…) |
| Respuestas | Mínimas y versionadas (`/api/v1/customers`, `/api/v1/sales/today`); datos personales reducidos |
| Bitácora | `logTenantAction` con el actor de la llave; cupos por negocio (`UsageCounter`) |
| MCP | Capa delgada sobre `/api/v1` (sin reglas propias) |
| n8n | Solo por la API y los eventos; **nunca** credenciales de la base |
| Pruebas | Una llave de un negocio no lee otro; alcance faltante → 403; llave revocada o vencida → 401; la prueba de `tenantId` cubre los repositorios que la API usa |

## Primer paso exacto para continuar

1. Mergear en orden: #48 → #49 (rediseño), #50 → #51 → #52 → PR del paso 2
   (las migraciones van en cadena) y NexusThrive/nexus-thrive-web#3.
2. Aplicar en producción los SQL 10, 11 y 12 de `docs/prod-sql/00-ORDEN.md`
   (o migrar desde el despliegue).
3. Paso 2 → pantalla "Documentos" con `FormDrawer` y `quotes` en `READY`.
