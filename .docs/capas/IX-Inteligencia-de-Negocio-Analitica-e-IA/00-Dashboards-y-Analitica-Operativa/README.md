---
id: IX.00
capa: "IX — INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA"
titulo: "Dashboards y analítica operativa"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# IX.00 — Dashboards y analítica operativa

> Escalera de madurez de la subcapa **IX.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `dashboards`, `widgets`, `dashboard-layouts` |
| Eventos (outbox → webhooks) | `dashboard.shared` |
| MCP · lectura | `get_dashboard`, `list_widgets` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `save_dashboard_layout` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: dashboards, widgets, dashboard-layouts (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: dashboard.shared (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_dashboard, list_widgets (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: save_dashboard_layout (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de indicadores y fuentes de datos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Dashboard con métricas básicas

#### Funcionalidad

- [x] Dashboard de inicio por negocio
- [x] Tarjetas de KPI
- [ ] Filtros
- [ ] Exportar a Excel o PDF.

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Filtros, periodos, desgloses y comparaciones

#### Funcionalidad

- [ ] Dashboards por vertical
- [ ] Dashboards por rol
- [ ] Gráficos interactivos
- [ ] Comparativos
- [ ] Vista consolidada de todos los módulos
- [ ] Enlace de solo lectura
- [ ] Pulso del negocio: señales de madurez con acción sugerida y avisos por WhatsApp/correo cuando una empeora _(objetivo 2026)_ _(PR-29)_ _(PR-30)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración de datos entre módulos

#### Funcionalidad

- [ ] Constructor de reportes propio
- [ ] Métricas oficiales y certificadas
- [ ] Dashboards personalizables
- [ ] Multi-sede y multi-negocio
- [ ] Permisos a nivel de fila y de columna.
- [ ] Segmentos guardados
- [ ] Análisis de embudo
- [ ] Rendimiento

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Actualización, distribución y alertas automatizadas

#### Funcionalidad

- [ ] Consulta en lenguaje natural
- [ ] Almacén de datos y modelado avanzado
- [ ] BI embebido y white-label
- [ ] Benchmarks anónimos entre negocios de la misma vertical
- [ ] Exportación a herramientas externas
- [ ] Simulaciones y escenarios
- [ ] Narrativas automáticas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de tendencias y detección de desviaciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Plataforma empresarial de analítica y autoservicio

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

