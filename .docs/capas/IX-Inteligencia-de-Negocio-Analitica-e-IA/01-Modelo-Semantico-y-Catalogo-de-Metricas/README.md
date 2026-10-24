---
id: IX.01
capa: "IX — INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA"
titulo: "Modelo semántico y catálogo de métricas"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# IX.01 — Modelo semántico y catálogo de métricas

> Escalera de madurez de la subcapa **IX.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `metrics`, `metric-definitions`, `dimensions` |
| Eventos (outbox → webhooks) | `metric.definition_changed` |
| MCP · lectura | `list_metrics`, `query_metric`, `explain_metric` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | — |
| Sistemas externos (puertos y adaptadores) | Exportación a BI externo (Metabase, Looker Studio) |

#### Integración

- [ ] API REST de lectura: metrics, metric-definitions, dimensions (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: metric.definition_changed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_metrics, query_metric, explain_metric (N2) <!-- mcp-lectura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de entidades, métricas y definiciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Catálogo básico de indicadores

#### Funcionalidad

- [ ] Capa de datos unificada
- [ ] Modelo semántico / catálogo de métricas
- [x] Eventos y cronología del cliente — _hecho: línea de tiempo en la ficha 360°_
- [x] Aislamiento multi-tenant — _hecho: contexto del negocio en el servidor + FK a `Tenant` + RLS_
- [x] Permisos sobre datos — _hecho: matriz `lib/business/permissions.ts`_
- [ ] Calidad de datos
- [x] Motor de notificaciones — _hecho: avisos derivados en la barra (vencimientos, stock bajo, citas)_
- [ ] Registro inmutable de eventos del sistema

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Definiciones, fórmulas, dimensiones y propietarios

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N3 — Integración y normalización de fuentes de datos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N4 — Validación y actualización automatizada de métricas

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N5 — Análisis de calidad, linaje y consistencia semántica

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Capa semántica empresarial gobernada y reutilizable

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

