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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


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
- [ ] Notas crédito y débito _(PR-16)_
- [ ] Devoluciones _(PR-16)_
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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Ventas empresariales: multiempresa, portales y financiación

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

