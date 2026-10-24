---
id: III.00
capa: "III — ATENCIÓN Y COMUNICACIÓN"
titulo: "Bandeja de entrada omnicanal"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# III.00 — Bandeja de entrada omnicanal

> Escalera de madurez de la subcapa **III.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `conversations`, `messages`, `channels`, `assignments` |
| Eventos (outbox → webhooks) | `conversation.opened`, `message.received`, `conversation.assigned`, `conversation.closed` |
| MCP · lectura | `list_conversations`, `get_conversation` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `send_message`, `assign_conversation` |
| Sistemas externos (puertos y adaptadores) | WhatsApp Business, correo, Instagram, webchat |

#### Integración

- [ ] API REST de lectura: conversations, messages, channels, assignments (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: conversation.opened, message.received, conversation.assigned, conversation.closed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_conversations, get_conversation (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: send_message, assign_conversation (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de canales, conversaciones y participantes

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Bandeja de entrada de un canal

#### Funcionalidad

- [ ] WhatsApp
- [ ] Responder, adjuntar archivos y notas internas.
- [ ] Asignación manual a un agente y estados de conversación.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión de conversaciones, estados y asignaciones

#### Funcionalidad

- [ ] Instagram, Facebook Messenger y correo
- [ ] Asignación automática (rotativa o por carga), etiquetas y búsqueda.
- [ ] Respuestas guardadas con variables
- [ ] Vista del cliente al lado: historial, reservas, cotizaciones y pagos.
- [ ] Plantillas aprobadas de WhatsApp
- [ ] Indicadores de leído, entregado y “escribiendo”.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración de múltiples canales y CRM

#### Funcionalidad

- [ ] Horarios, equipos y reglas de enrutamiento
- [ ] Notas internas, menciones (@) y traspaso
- [ ] Supervisión en vivo
- [ ] Mensajes masivos y difusiones
- [ ] Gestión de consentimiento
- [ ] Métricas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Distribución, respuestas y notificaciones automatizadas

#### Funcionalidad

- [ ] Más canales
- [ ] Detección de idioma y traducción automática
- [ ] Priorización con IA
- [ ] Sugerencias de respuesta (copiloto IA)
- [ ] Anti-spam y control de calidad
- [ ] Multi-marca

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Priorización inteligente y análisis de conversaciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Centro de comunicaciones omnicanal empresarial

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

