---
id: IV.01
capa: "IV — GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES"
titulo: "Embudos comerciales y oportunidades"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# IV.01 — Embudos comerciales y oportunidades

> Escalera de madurez de la subcapa **IV.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `pipelines`, `opportunities`, `stages` |
| Eventos (outbox → webhooks) | `opportunity.created`, `opportunity.stage_changed`, `opportunity.won`, `opportunity.lost` |
| MCP · lectura | `list_opportunities`, `get_pipeline_summary` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_opportunity`, `move_opportunity` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: pipelines, opportunities, stages (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: opportunity.created, opportunity.stage_changed, opportunity.won, opportunity.lost (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_opportunities, get_pipeline_summary (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_opportunity, move_opportunity (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de etapas y ciclo comercial

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Embudo básico y oportunidades

#### Funcionalidad

- [ ] Estados simples
- [ ] Lista de contactos por estado.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Etapas, actividades, importes y previsiones

#### Funcionalidad

- [ ] Pipeline de ventas (embudo)
- [ ] Oportunidades / negocios
- [ ] Varios pipelines
- [ ] Motivo de pérdida
- [ ] Totales por etapa

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con clientes, cotizaciones y comunicaciones

#### Funcionalidad

- [ ] Reglas por etapa
- [ ] Aprobación de descuentos
- [ ] Oportunidad ganada que dispara acciones
- [ ] Tiempo en cada etapa
- [ ] Productos y servicios con catálogo y listas de precios
- [ ] Oportunidades con varios participantes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Seguimientos, tareas y cambios de etapa automatizados

#### Funcionalidad

- [ ] Pronóstico de ventas (forecast)
- [ ] Probabilidad calculada por IA
- [ ] Planificación de cuentas clave
- [ ] Gestión de renovaciones

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Predicción de cierre y análisis de conversión

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Orquestación comercial multiequipo y multitenant

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

