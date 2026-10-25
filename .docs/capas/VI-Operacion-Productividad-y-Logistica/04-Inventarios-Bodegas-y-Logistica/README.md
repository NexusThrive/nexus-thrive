---
id: VI.04
capa: "VI — OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
titulo: "Inventarios, bodegas y logística"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# VI.04 — Inventarios, bodegas y logística

> Escalera de madurez de la subcapa **VI.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `warehouses`, `stock-levels`, `stock-movements`, `transfers`, `kardex` |
| Eventos (outbox → webhooks) | `stock.moved`, `stock.below_minimum`, `stock.adjusted`, `transfer.completed` |
| MCP · lectura | `get_stock`, `list_low_stock`, `get_kardex` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `adjust_stock`, `create_transfer` |
| Sistemas externos (puertos y adaptadores) | Lectores de código de barras, transportadoras |

#### Integración

- [ ] API REST de lectura: warehouses, stock-levels, stock-movements, transfers, kardex (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: stock.moved, stock.below_minimum, stock.adjusted, transfer.completed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_stock, list_low_stock, get_kardex (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: adjust_stock, create_transfer (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de artículos, existencias y ubicaciones

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Inventarios, bodegas y logística»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Inventarios, bodegas y logística»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `warehouses`, `stock-levels`, `stock-movements`, `transfers`, `kardex`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `stock.moved`, `stock.below_minimum`, `stock.adjusted`, `transfer.completed`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro y consulta de inventario

#### Funcionalidad

- [x] Entradas, salidas y existencias — _hecho: movimientos de stock_
- [x] Ajustes manuales con motivo. — _hecho: salida o ajuste exige motivo_
- [x] Stock actual — _hecho: Catálogo_
- [x] Descuento automático al facturar y suma al recibir compras. _(PR-10)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Entradas, salidas, ajustes, transferencias y conteos

#### Funcionalidad

- [x] Múltiples bodegas _(PR-10)_
- [x] Kardex _(PR-10)_
- [ ] Lotes, fechas de vencimiento y series.
- [x] Stock mínimo, máximo y punto de reorden _hecho: lib/inventory/stock-docs-db.ts (reorderOverview) + pestaña Reposición_
- [x] Conteos físicos y ajustes por inventario _hecho: StockCount; cerrar aplica la diferencia con motivo_
- [x] Método de costeo _(PR-10)_
- [ ] Inventario por obra o por sede

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con compras, ventas y POS

#### Funcionalidad

- [ ] Reservas y disponibilidad
- [ ] Control de concurrencia
- [ ] Stock negativo
- [ ] Valoración del inventario y su conciliación con la contabilidad
- [ ] Costo en destino
- [ ] Inventarios cíclicos
- [ ] Consumos por proyecto, por servicio o por receta
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Alertas de stock y reposición automatizada

#### Funcionalidad

- [ ] WMS
- [ ] Despachos, rutas y transportadoras
- [ ] Trazabilidad completa
- [ ] Pronóstico de demanda y reposición automática
- [ ] Dropshipping, consignación y bodegas de terceros.
- [ ] Inventario multi-empresa
- [ ] Mantenimiento de activos y gestión de flota

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Predicción de demanda y optimización de inventario

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Inventarios, bodegas y logística» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de anomalías (montos atípicos, duplicados, desvíos frente al historial) con explicación de por qué se marcó _(propuesta)_
- [ ] Sugerencia de cuenta, impuesto o clasificación con nivel de confianza; nada se contabiliza sin regla o aprobación _(propuesta)_
- [ ] Previsión a corto plazo con el historial real y el margen de error mostrado _(propuesta)_


## N6 — Gestión empresarial de bodegas, despachos y trazabilidad

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación multimoneda y multiempresa con eliminaciones y conciliación entre entidades _(propuesta)_
- [ ] Auditoría completa e inalterable de cada cambio, consultable y exportable _(propuesta)_
- [ ] Volumen: pruebas con cargas grandes (miles de documentos por mes) y cierres sin bloquear la operación _(propuesta)_

