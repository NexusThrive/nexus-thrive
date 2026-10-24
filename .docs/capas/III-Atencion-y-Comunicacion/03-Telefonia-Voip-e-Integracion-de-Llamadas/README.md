---
id: III.03
capa: "III — ATENCIÓN Y COMUNICACIÓN"
titulo: "Telefonía VoIP e integración de llamadas"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# III.03 — Telefonía VoIP e integración de llamadas

> Escalera de madurez de la subcapa **III.03**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `calls`, `call-recordings`, `extensions` |
| Eventos (outbox → webhooks) | `call.started`, `call.ended`, `call.missed`, `voicemail.received` |
| MCP · lectura | `list_calls`, `get_call_summary` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `start_call` |
| Sistemas externos (puertos y adaptadores) | Proveedor VoIP / SIP (Twilio, Telnyx u otro) |

#### Integración

- [ ] API REST de lectura: calls, call-recordings, extensions (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: call.started, call.ended, call.missed, voicemail.received (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_calls, get_call_summary (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: start_call (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de telefonía, extensiones y llamadas

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Llamadas entrantes y salientes básicas

#### Funcionalidad

- [ ] Botón “llamar” y “WhatsApp”
- [ ] Enlace a Google Meet o Zoom pegado en la cita.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Registro, historial y administración de extensiones

#### Funcionalidad

- [ ] Click-to-call
- [ ] Agenda con disponibilidad
- [ ] Recordatorios automáticos por WhatsApp y correo.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con CRM y bandeja omnicanal

#### Funcionalidad

- [ ] Grabación de llamadas
- [ ] Números por negocio
- [ ] Agenda por profesional o recurso
- [ ] Sincronización bidireccional

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Enrutamiento, colas y seguimiento automatizado

#### Funcionalidad

- [ ] Call center completo
- [ ] Transcripción y análisis de llamadas con IA
- [ ] Videollamada propia embebida
- [ ] Agenda con pago anticipado, depósitos y lista de espera.
- [ ] Eventos y webinars

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Analítica de llamadas y asistencia conversacional

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Telefonía empresarial integrada y alta disponibilidad

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

