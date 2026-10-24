---
id: VI.05
capa: "VI — OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
titulo: "Compras y gestión de proveedores"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VI.05 — Compras y gestión de proveedores

> Escalera de madurez de la subcapa **VI.05**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `suppliers`, `purchase-orders`, `purchase-receipts`, `supplier-invoices` |
| Eventos (outbox → webhooks) | `purchase_order.created`, `purchase_order.received`, `supplier_invoice.registered` |
| MCP · lectura | `list_purchase_orders`, `get_supplier` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `draft_purchase_order`, `register_supplier_invoice` |
| Sistemas externos (puertos y adaptadores) | Facturas electrónicas de proveedores (DIAN, vía proveedor tecnológico) |

#### Integración

- [ ] API REST de lectura: suppliers, purchase-orders, purchase-receipts, supplier-invoices (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: purchase_order.created, purchase_order.received, supplier_invoice.registered (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_purchase_orders, get_supplier (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: draft_purchase_order, register_supplier_invoice (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de proveedores, necesidades y adquisiciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro de proveedores y compras básicas

#### Funcionalidad

- [ ] Orden de compra _(PR-11)_
- [ ] Registro de la factura del proveedor _(PR-11)_
- [ ] Entrada de mercancía al inventario al recibir. _(PR-11)_
- [ ] Ficha de proveedor _(PR-11)_
- [ ] Documentos básicos
- [ ] Listado y búsqueda _(PR-11)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Solicitudes, órdenes, aprobaciones y recepción

#### Funcionalidad

- [ ] Solicitud de compra
- [ ] Cotización a varios proveedores
- [ ] Recepción de mercancía
- [ ] Cruce de tres vías
- [ ] Notas crédito de proveedor y devoluciones de compra.
- [ ] Documento soporte
- [ ] Retenciones aplicadas
- [ ] Costo de compra
- [ ] Cotizaciones comparativas
- [ ] Órdenes de compra y de servicio
- [ ] Historial de compras, precios y entregas
- [ ] Contratos y vencimientos
- [ ] Cuentas por pagar
- [ ] Evaluación simple

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con inventario, documentos y cuentas por pagar

#### Funcionalidad

- [ ] Aprobación por monto y por categoría
- [ ] Segregación de funciones
- [ ] Contratos marco y precios pactados
- [ ] Presupuesto comprometido
- [ ] Compras ligadas a proyectos y obras
- [ ] Evaluación de proveedores
- [ ] Reportes
- [ ] Proceso de homologación
- [ ] Contratistas de obra o servicio
- [ ] Seguridad social y SG-SST del contratista
- [ ] Evaluación periódica
- [ ] Listas de control
- [ ] Portal del proveedor

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Reposición, aprobaciones y seguimiento automatizados

#### Funcionalidad

- [ ] Licitaciones y subastas inversas
- [ ] Compras automáticas por reposición
- [ ] Lectura de facturas con OCR y de facturas electrónicas (XML)
- [ ] Portal del proveedor
- [ ] Compras consolidadas entre sedes y empresas
- [ ] Análisis de gasto con IA
- [ ] Gestión de riesgo del proveedor
- [ ] Licitaciones y subastas
- [ ] Contratos marco y precios pactados
- [ ] Pagos automáticos y dispersión
- [ ] Marketplace de proveedores
- [ ] Cumplimiento y auditoría

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Evaluación de proveedores y análisis de costos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de abastecimiento y compras

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

