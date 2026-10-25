---
id: V.06
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Ventas, pedidos y entregas"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# V.06 — Ventas, pedidos y entregas

> Escalera de madurez de la subcapa **V.06**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `commercial-documents`, `orders`, `deliveries`, `credit-notes` |
| Eventos (outbox → webhooks) | `document.created`, `document.converted`, `sale.completed`, `sale.voided`, `delivery.dispatched`, `delivery.completed` |
| MCP · lectura | `list_sales`, `get_document`, `get_sales_summary` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_sale`, `void_sale`, `convert_quote_to_order` |
| Sistemas externos (puertos y adaptadores) | Facturación electrónica (VII.04) como paso posterior |

#### Integración

- [ ] API REST de lectura: commercial-documents, orders, deliveries, credit-notes (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: document.created, document.converted, sale.completed, sale.voided, delivery.dispatched, delivery.completed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_sales, get_document, get_sales_summary (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_sale, void_sale, convert_quote_to_order (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de ventas, documentos y estados encadenados

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Ventas, pedidos y entregas»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Ventas, pedidos y entregas»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `commercial-documents`, `orders`, `deliveries`, `credit-notes`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `document.created`, `document.converted`, `sale.completed`, `sale.voided`, `delivery.dispatched`, `delivery.completed`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Cotización, pedido y factura encadenados

#### Funcionalidad

- [ ] Cotización, pedido y factura o recibo
- [ ] Estados: borrador, enviada, aceptada, facturada, anulada.
- [ ] PDF con la marca del negocio y envío por WhatsApp o correo.
- [x] Cuenta por cobrar — _hecho: cuentas de cobro numeradas en Facturación_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Listas de precios, descuentos, notas y remisiones

#### Funcionalidad

- [ ] Listas de precios, descuentos y promociones
- [x] Notas crédito y débito _(PR-16)_
- [x] Devoluciones _(PR-16)_
- [ ] Remisiones
- [ ] Facturación parcial
- [ ] Vendedor y comisión
- [ ] Integración con CRM
- [ ] Cobro en el momento

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Aprobaciones, cupo de crédito y facturación recurrente

#### Funcionalidad

- [ ] Aprobación de descuentos, de crédito y de precios especiales
- [ ] Cupo de crédito del cliente
- [ ] Reserva de inventario
- [ ] Contratos y facturación recurrente
- [ ] Facturación por avance o por actas
- [ ] Márgenes por documento
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Motor de precios avanzado (CPQ)

#### Funcionalidad

- [ ] Motor de precios avanzado (CPQ)
- [ ] Ventas multi-sede, multi-moneda y multiempresa
- [ ] Portal del cliente
- [ ] Pronóstico de demanda y de ventas
- [ ] Venta consignada, anticipos de clientes y financiación.
- [ ] Comisiones complejas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Pronóstico de ventas y reserva inteligente de inventario

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Ventas, pedidos y entregas» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de anomalías (montos atípicos, duplicados, desvíos frente al historial) con explicación de por qué se marcó _(propuesta)_
- [ ] Sugerencia de cuenta, impuesto o clasificación con nivel de confianza; nada se contabiliza sin regla o aprobación _(propuesta)_
- [ ] Previsión a corto plazo con el historial real y el margen de error mostrado _(propuesta)_


## N6 — Ventas empresariales: multiempresa, portales y financiación

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación multimoneda y multiempresa con eliminaciones y conciliación entre entidades _(propuesta)_
- [ ] Auditoría completa e inalterable de cada cambio, consultable y exportable _(propuesta)_
- [ ] Volumen: pruebas con cargas grandes (miles de documentos por mes) y cierres sin bloquear la operación _(propuesta)_

