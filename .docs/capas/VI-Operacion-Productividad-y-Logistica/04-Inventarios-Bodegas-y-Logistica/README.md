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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro y consulta de inventario

#### Funcionalidad

- [x] Entradas, salidas y existencias — _hecho: movimientos de stock_
- [x] Ajustes manuales con motivo. — _hecho: salida o ajuste exige motivo_
- [x] Stock actual — _hecho: Catálogo_
- [ ] Descuento automático al facturar y suma al recibir compras. _(PR-10)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Entradas, salidas, ajustes, transferencias y conteos

#### Funcionalidad

- [ ] Múltiples bodegas _(PR-10)_
- [ ] Kardex _(PR-10)_
- [ ] Lotes, fechas de vencimiento y series.
- [ ] Stock mínimo, máximo y punto de reorden _(PR-11)_
- [ ] Conteos físicos y ajustes por inventario _(PR-11)_
- [ ] Método de costeo _(PR-10)_
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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de bodegas, despachos y trazabilidad

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

