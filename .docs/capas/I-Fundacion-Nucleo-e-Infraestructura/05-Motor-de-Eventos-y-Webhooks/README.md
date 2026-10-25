---
id: I.05
capa: "I — FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
titulo: "Motor de eventos y webhooks"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# I.05 — Motor de eventos y webhooks

> Escalera de madurez de la subcapa **I.05**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `events`, `webhook-endpoints`, `webhook-deliveries`, `event-types` |
| Eventos (outbox → webhooks) | `webhook.delivery_failed`, `webhook.endpoint_disabled` |
| MCP · lectura | `list_event_types`, `list_recent_events`, `get_delivery_status` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_webhook_endpoint`, `replay_event` |
| Sistemas externos (puertos y adaptadores) | n8n (disparadores por webhook), cualquier receptor HTTPS |

#### Integración

- [ ] API REST de lectura: events, webhook-endpoints, webhook-deliveries, event-types (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: webhook.delivery_failed, webhook.endpoint_disabled (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_event_types, list_recent_events, get_delivery_status (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_webhook_endpoint, replay_event (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de eventos y contratos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Motor de eventos y webhooks»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Motor de eventos y webhooks»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `events`, `webhook-endpoints`, `webhook-deliveries`, `event-types`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `webhook.delivery_failed`, `webhook.endpoint_disabled`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Emisión y recepción de eventos básicos

#### Funcionalidad

- [x] Webhooks salientes _(PR-03)_ _hecho: lib/events/dispatcher.ts + app/api/cron/webhooks_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión de eventos, estados y reintentos

#### Funcionalidad

- [x] Webhooks firmados _(PR-03)_ _hecho: lib/events/signing.ts (HMAC-SHA256, rotación de secreto)_
- [ ] Panel del desarrollador

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración entre módulos mediante eventos y webhooks

#### Funcionalidad

- [ ] Eventos como producto

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Enrutamiento, colas y procesamiento automatizado

#### Funcionalidad

- [ ] API GraphQL, streaming de eventos y acceso masivo

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Optimización de flujos y detección de fallos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Motor de eventos y webhooks» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Plataforma de eventos escalable y tolerante a fallos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

