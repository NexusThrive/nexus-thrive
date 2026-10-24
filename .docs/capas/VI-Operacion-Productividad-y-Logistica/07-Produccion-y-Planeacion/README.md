---
id: VI.07
capa: "VI — OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
titulo: "Producción y planeación"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VI.07 — Producción y planeación

> Escalera de madurez de la subcapa **VI.07**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `bills-of-materials`, `production-orders`, `work-centers` |
| Eventos (outbox → webhooks) | `production_order.started`, `production_order.completed`, `material.shortage_detected` |
| MCP · lectura | `get_bom`, `list_production_orders` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_production_order` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: bills-of-materials, production-orders, work-centers (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: production_order.started, production_order.completed, material.shortage_detected (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_bom, list_production_orders (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_production_order (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de fórmulas, materiales y órdenes

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Recetas y descuento de insumos

#### Funcionalidad

- [ ] Recetas o fórmulas simples
- [ ] Descuento de insumos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — BOM, órdenes de producción y costeo

#### Funcionalidad

- [ ] Listas de materiales (BOM)
- [ ] Órdenes de producción
- [ ] Costeo de producción
- [ ] Rendimiento y desperdicio

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — BOM multinivel, rutas y costo estándar vs. real

#### Funcionalidad

- [ ] BOM multinivel
- [ ] Rutas y operaciones
- [ ] Costo estándar vs. real
- [ ] Control de calidad en producción
- [ ] Producción por pedido o por stock
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Control de calidad y producción por pedido o stock

#### Funcionalidad

- [ ] MRP
- [ ] Planificación de capacidad y programación
- [ ] Pronóstico de demanda con IA
- [ ] Trazabilidad lote a lote
- [ ] Mantenimiento de maquinaria
- [ ] Subcontratación de procesos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — MRP y planificación de capacidad

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Producción inteligente: pronóstico, trazabilidad lote y OEE

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

