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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de servicios y SLA multinivel

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

