---
id: IV.03
capa: "IV — GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES"
titulo: "Calificación y asignación de prospectos"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# IV.03 — Calificación y asignación de prospectos

> Escalera de madurez de la subcapa **IV.03**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `leads`, `lead-scores`, `assignment-rules` |
| Eventos (outbox → webhooks) | `lead.created`, `lead.scored`, `lead.assigned` |
| MCP · lectura | `list_leads`, `get_lead_score` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `assign_lead` |
| Sistemas externos (puertos y adaptadores) | Formularios, anuncios (II.02, II.03) |

#### Integración

- [ ] API REST de lectura: leads, lead-scores, assignment-rules (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: lead.created, lead.scored, lead.assigned (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_leads, get_lead_score (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: assign_lead (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de criterios y reglas de calificación

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro y clasificación básica de prospectos

#### Funcionalidad

- [ ] Alta manual
- [ ] Formulario web simple
- [ ] Notificación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Puntuación, segmentos y reglas de asignación

#### Funcionalidad

- [ ] Captación desde formularios web, landing pages, WhatsApp y redes sociales
- [ ] Asignación de responsables
- [ ] Origen y UTM automáticos
- [ ] Respuesta automática inmediata
- [ ] Alerta de lead sin atender
- [ ] Formularios por vertical

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con formularios, campañas y CRM

#### Funcionalidad

- [ ] Reglas de enrutamiento avanzadas
- [ ] Tiempo de primera respuesta
- [ ] Reasignación automática
- [ ] Calificación inicial
- [ ] Control de leads duplicados
- [ ] Importación de listas y de leads de anuncios
- [ ] Reportes de captación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Distribución y seguimiento automatizados

#### Funcionalidad

- [ ] Lead scoring automático
- [ ] Calificación conversacional con IA
- [ ] Enrutamiento predictivo
- [ ] Integración con portales y marketplaces
- [ ] Atribución multicanal completa
- [ ] Captación por QR, eventos y ferias

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Calificación predictiva y priorización inteligente

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Orquestación avanzada de prospectos multicanal

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

