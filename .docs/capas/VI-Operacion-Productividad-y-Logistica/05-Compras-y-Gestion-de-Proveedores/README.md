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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Compras y gestión de proveedores»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Compras y gestión de proveedores»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `suppliers`, `purchase-orders`, `purchase-receipts`, `supplier-invoices`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `purchase_order.created`, `purchase_order.received`, `supplier_invoice.registered`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro de proveedores y compras básicas

#### Funcionalidad

- [x] Orden de compra _(PR-11)_ _hecho: app/[tenant]/(app)/purchases + lib/purchasing_
- [x] Registro de la factura del proveedor _(PR-11)_ _hecho: se registra al recibir (SupplierInvoice)_
- [x] Entrada de mercancía al inventario al recibir. _(PR-11)_ _hecho: receiveOrder → servicio de inventario con costo_
- [x] Ficha de proveedor _(PR-11)_ _hecho: Proveedores = terceros con rol SUPPLIER_
- [ ] Documentos básicos
- [x] Listado y búsqueda _(PR-11)_ _hecho: lista de órdenes con filtros y búsqueda de proveedores_

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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Compras y gestión de proveedores» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de anomalías (montos atípicos, duplicados, desvíos frente al historial) con explicación de por qué se marcó _(propuesta)_
- [ ] Sugerencia de cuenta, impuesto o clasificación con nivel de confianza; nada se contabiliza sin regla o aprobación _(propuesta)_
- [ ] Previsión a corto plazo con el historial real y el margen de error mostrado _(propuesta)_


## N6 — Gestión empresarial de abastecimiento y compras

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación multimoneda y multiempresa con eliminaciones y conciliación entre entidades _(propuesta)_
- [ ] Auditoría completa e inalterable de cada cambio, consultable y exportable _(propuesta)_
- [ ] Volumen: pruebas con cargas grandes (miles de documentos por mes) y cierres sin bloquear la operación _(propuesta)_

