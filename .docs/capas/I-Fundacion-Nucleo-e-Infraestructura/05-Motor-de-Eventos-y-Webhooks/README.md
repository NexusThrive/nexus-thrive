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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Emisión y recepción de eventos básicos

#### Funcionalidad

- [ ] Webhooks salientes _(PR-03)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión de eventos, estados y reintentos

#### Funcionalidad

- [ ] Webhooks firmados _(PR-03)_
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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Plataforma de eventos escalable y tolerante a fallos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

