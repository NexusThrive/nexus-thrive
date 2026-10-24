---
id: VI.08
capa: "VI — OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
titulo: "Automatizaciones y flujos de trabajo"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# VI.08 — Automatizaciones y flujos de trabajo

> Escalera de madurez de la subcapa **VI.08**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `workflows`, `workflow-runs`, `triggers`, `connections` |
| Eventos (outbox → webhooks) | `workflow.run_completed`, `workflow.run_failed` |
| MCP · lectura | `list_workflows`, `get_run_status` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `trigger_workflow`, `pause_workflow` |
| Sistemas externos (puertos y adaptadores) | n8n (instancia propia o en la nube): nodo comunitario de NEXUS, disparadores por webhook y acciones por la API |

#### Integración

- [ ] API REST de lectura: workflows, workflow-runs, triggers, connections (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: workflow.run_completed, workflow.run_failed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_workflows, get_run_status (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: trigger_workflow, pause_workflow (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de reglas, disparadores y acciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Reglas simples con plantillas

#### Funcionalidad

- [ ] Reglas simples “si pasa X, haz Y”
- [ ] Activar y desactivar cada regla.
- [ ] Acciones básicas: enviar mensaje, crear tarea, cambiar estado, notificar al…
- [ ] n8n conectado a NEXUS por la API con llave del negocio (nunca a la base) _(objetivo 2026 · ver `docs/PENDIENTES.md`)_ _(PR-07)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Constructor visual de flujos

#### Funcionalidad

- [ ] Constructor visual
- [ ] Disparadores de todos los módulos
- [ ] Condiciones y filtros
- [ ] Esperas y programación
- [ ] Variables y plantillas
- [ ] Historial de ejecuciones
- [ ] Eventos de NEXUS hacia n8n con outbox transaccional y webhooks firmados _(objetivo 2026 · ver `docs/PENDIENTES.md`)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Ramas, bucles y aprobaciones humanas

#### Funcionalidad

- [ ] Ramas y bucles
- [ ] Aprobaciones humanas
- [ ] Permisos y entornos
- [ ] Límites y protección
- [ ] Webhooks entrantes y salientes
- [ ] Versionado de flujos
- [ ] Métricas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Webhooks, versionado y métricas de flujos

#### Funcionalidad

- [ ] Pasos con IA
- [ ] Agentes autónomos
- [ ] Conectores a miles de apps
- [ ] Biblioteca de flujos por vertical
- [ ] Orquestación entre negocios
- [ ] Observabilidad avanzada

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Pasos con IA y agentes autónomos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Orquestación empresarial y observabilidad avanzada

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

