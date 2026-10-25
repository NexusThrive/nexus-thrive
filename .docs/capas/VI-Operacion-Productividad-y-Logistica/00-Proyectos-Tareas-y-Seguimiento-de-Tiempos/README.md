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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Proyectos, tareas y seguimiento de tiempos»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Proyectos, tareas y seguimiento de tiempos»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `projects`, `tasks`, `time-entries`, `milestones`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `task.created`, `task.assigned`, `task.completed`, `time_entry.logged`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Proyectos, tareas y seguimiento de tiempos» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Gestión empresarial de portafolios y recursos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

