---
id: VI.00
capa: "VI — OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
titulo: "Proyectos, tareas y seguimiento de tiempos"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# VI.00 — Proyectos, tareas y seguimiento de tiempos

> Escalera de madurez de la subcapa **VI.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `projects`, `tasks`, `time-entries`, `milestones` |
| Eventos (outbox → webhooks) | `task.created`, `task.assigned`, `task.completed`, `time_entry.logged` |
| MCP · lectura | `list_tasks`, `get_project_status`, `get_time_summary` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_task`, `complete_task`, `log_time` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: projects, tasks, time-entries, milestones (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: task.created, task.assigned, task.completed, time_entry.logged (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_tasks, get_project_status, get_time_summary (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_task, complete_task, log_time (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de proyectos, tareas y responsabilidades

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Creación y seguimiento básico de tareas

#### Funcionalidad

- [x] Proyectos con responsable, fechas y estado. — _hecho: obras (vertical construcción)_
- [ ] Tareas con título, responsable, fecha límite y prioridad.
- [ ] Vista de lista y tablero Kanban (por hacer, en curso, hecho).
- [ ] Comentarios y adjuntos por tarea.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Proyectos, dependencias, prioridades y tiempos

#### Funcionalidad

- [ ] Subtareas, etiquetas y checklists
- [ ] Plantillas de proyecto
- [ ] Vista de calendario
- [ ] Recordatorios
- [ ] Vínculo con el CRM y las ventas
- [ ] Tareas recurrentes (semanales, mensuales).

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con usuarios, calendarios y módulos de negocio

#### Funcionalidad

- [ ] Cronograma tipo Gantt
- [ ] Carga de trabajo por persona
- [ ] Horas registradas
- [ ] Hitos y entregables
- [ ] Presupuesto vs. real
- [ ] Reportes
- [ ] Permisos por proyecto

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Asignación, recordatorios y flujos automatizados

#### Funcionalidad

- [ ] Portafolio de proyectos
- [ ] Planificación de recursos
- [ ] Línea base y desviaciones
- [ ] IA
- [ ] Gestión de riesgos, cambios y problemas
- [ ] Sincronización con herramientas externas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de productividad y previsión de retrasos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de portafolios y recursos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

