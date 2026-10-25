---
id: III.02
capa: "III — ATENCIÓN Y COMUNICACIÓN"
titulo: "Helpdesk, tickets y SLA"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# III.02 — Helpdesk, tickets y SLA

> Escalera de madurez de la subcapa **III.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `tickets`, `ticket-comments`, `sla-policies` |
| Eventos (outbox → webhooks) | `ticket.created`, `ticket.updated`, `ticket.sla_breached`, `ticket.resolved` |
| MCP · lectura | `list_tickets`, `get_ticket`, `get_sla_status` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_ticket`, `reply_ticket`, `close_ticket` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: tickets, ticket-comments, sla-policies (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: ticket.created, ticket.updated, ticket.sla_breached, ticket.resolved (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_tickets, get_ticket, get_sla_status (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_ticket, reply_ticket, close_ticket (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de incidencias, prioridades y acuerdos de servicio

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Helpdesk, tickets y SLA»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Helpdesk, tickets y SLA»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `tickets`, `ticket-comments`, `sla-policies`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `ticket.created`, `ticket.updated`, `ticket.sla_breached`, `ticket.resolved`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Creación y seguimiento básico de tickets

#### Funcionalidad

- [ ] Ticket manual

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Colas, estados, prioridades y reglas de SLA

#### Funcionalidad

- [ ] Tickets automáticos
- [ ] Categorías, prioridades, responsables y SLA básico (tiempo de primera respuesta y…
- [ ] Respuestas por correo o WhatsApp desde el mismo ticket.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con canales, clientes y base de conocimiento

#### Funcionalidad

- [ ] SLA por prioridad y plan
- [ ] Base de conocimiento / centro de ayuda
- [ ] Fusionar tickets
- [ ] Motivos de reclamo
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Asignación, escalamiento y alertas automatizadas

#### Funcionalidad

- [ ] Portal de autoservicio
- [ ] Clasificación y enrutamiento automático con IA
- [ ] Flujos de aprobación
- [ ] Gestión de incidentes masivos
- [ ] SLA contractuales por cliente

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de resolución y predicción de incumplimientos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Canal y atención». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Helpdesk, tickets y SLA» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Respuestas sugeridas, resumen de la conversación y clasificación por intención _(propuesta)_
- [ ] Prioridad y enrutamiento sugeridos según urgencia, valor del cliente y carga del equipo _(propuesta)_
- [ ] Detección de temas repetidos para proponer plantillas o respuestas rápidas _(propuesta)_


## N6 — Gestión empresarial de servicios y SLA multinivel

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Canal y atención». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de varias líneas, sedes y equipos con colas, horarios y escalamiento _(propuesta)_
- [ ] Cumplimiento: consentimiento, bajas y límites de cada proveedor respetados y registrados _(propuesta)_
- [ ] Límites por plan y consumo medido (mensajes, conversaciones) _(propuesta)_

