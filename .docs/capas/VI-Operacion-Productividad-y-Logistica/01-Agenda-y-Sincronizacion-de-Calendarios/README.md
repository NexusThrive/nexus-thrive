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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Agenda y sincronización de calendarios»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Agenda y sincronización de calendarios»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `calendars`, `events`, `reminders`, `calendar-connections`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `calendar_event.created`, `calendar_event.changed`, `reminder.due`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Agenda y sincronización de calendarios» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Gestión empresarial de calendarios y recursos compartidos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

