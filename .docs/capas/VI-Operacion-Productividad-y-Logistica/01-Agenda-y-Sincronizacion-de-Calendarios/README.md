---
id: VI.01
capa: "VI — OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
titulo: "Agenda y sincronización de calendarios"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# VI.01 — Agenda y sincronización de calendarios

> Escalera de madurez de la subcapa **VI.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `calendars`, `events`, `reminders`, `calendar-connections` |
| Eventos (outbox → webhooks) | `calendar_event.created`, `calendar_event.changed`, `reminder.due` |
| MCP · lectura | `list_calendar_events`, `find_free_slots` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_calendar_event`, `schedule_reminder` |
| Sistemas externos (puertos y adaptadores) | Google Calendar, Microsoft 365 (sincronización bidireccional) |

#### Integración

- [ ] API REST de lectura: calendars, events, reminders, calendar-connections (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: calendar_event.created, calendar_event.changed, reminder.due (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_calendar_events, find_free_slots (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_calendar_event, schedule_reminder (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de eventos, calendarios y disponibilidad

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Agenda y eventos básicos

#### Funcionalidad

- [x] Calendario con citas manuales (cliente, fecha, hora, servicio). — _hecho: Agenda_
- [x] Recordatorio por WhatsApp o correo — _hecho: manual por WhatsApp (wa.me)_
- [x] Estados: pendiente, confirmada, cancelada, atendida. — _hecho: `BookingStatus`_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Recurrencias, participantes y conflictos de horario

#### Funcionalidad

- [ ] Agenda por profesional o recurso
- [ ] Página pública de reserva de citas
- [ ] Confirmación con un clic
- [ ] Servicios con duración y precio
- [ ] Enlace de Meet o Zoom
- [ ] Integración con el CRM: la cita queda en el historial del cliente.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con tareas, reservas y calendarios externos

#### Funcionalidad

- [ ] Sincronización bidireccional
- [ ] Anticipo o pago al reservar
- [ ] Lista de espera
- [ ] Citas recurrentes y paquetes
- [ ] Citas grupales y clases
- [ ] Reglas de reserva
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Sincronización y recordatorios automatizados

#### Funcionalidad

- [ ] Agenda inteligente con IA
- [ ] Agendamiento por chat y voz
- [ ] Multi-sede
- [ ] Predicción de no-show
- [ ] Recordatorios adaptativos
- [ ] API y widget

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Optimización de agendas y detección de conflictos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de calendarios y recursos compartidos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

