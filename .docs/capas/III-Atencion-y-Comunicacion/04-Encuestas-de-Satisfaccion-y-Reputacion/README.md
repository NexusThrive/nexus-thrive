---
id: III.04
capa: "III — ATENCIÓN Y COMUNICACIÓN"
titulo: "Encuestas de satisfacción y reputación"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# III.04 — Encuestas de satisfacción y reputación

> Escalera de madurez de la subcapa **III.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `surveys`, `survey-responses`, `reviews` |
| Eventos (outbox → webhooks) | `survey.sent`, `survey.answered`, `review.received` |
| MCP · lectura | `get_nps`, `list_reviews` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `send_survey`, `draft_review_reply` |
| Sistemas externos (puertos y adaptadores) | Google Reviews |

#### Integración

- [ ] API REST de lectura: surveys, survey-responses, reviews (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: survey.sent, survey.answered, review.received (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_nps, list_reviews (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: send_survey, draft_review_reply (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de satisfacción, indicadores y reputación

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Encuestas de satisfacción y reputación»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Encuestas de satisfacción y reputación»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `surveys`, `survey-responses`, `reviews`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `survey.sent`, `survey.answered`, `review.received`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Encuestas básicas y registro de respuestas

#### Funcionalidad

- [x] Enlace a Google Reviews _(PR-28)_ — _hecho: `createReview` en `lib/growth/growth-db.ts` devuelve el enlace de reseña de Google (`googleReviewUrl` en `lib/growth/growth.ts`) y `app/s/[slug]/resena/review-form.tsx` lo muestra tras una reseña no baja_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Plantillas, métricas y gestión de resultados

#### Funcionalidad

- [ ] Encuesta post-servicio automática
- [ ] Solicitud automática de reseña en Google si la calificación es alta.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con CRM, ventas y atención

#### Funcionalidad

- [ ] Encuestas por evento
- [ ] Alertas inmediatas
- [ ] Panel de reputación
- [ ] Responder reseñas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Envío, seguimiento y alertas automatizadas

#### Funcionalidad

- [ ] NPS relacional y transaccional
- [ ] Análisis de sentimiento y temas
- [ ] Respuestas a reseñas con IA
- [ ] Programa de referidos
- [ ] Cierre del ciclo

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de sentimiento y detección de insatisfacción

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Canal y atención». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Encuestas de satisfacción y reputación» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Respuestas sugeridas, resumen de la conversación y clasificación por intención _(propuesta)_
- [ ] Prioridad y enrutamiento sugeridos según urgencia, valor del cliente y carga del equipo _(propuesta)_
- [ ] Detección de temas repetidos para proponer plantillas o respuestas rápidas _(propuesta)_


## N6 — Gestión integral de experiencia y reputación multicanal

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Canal y atención». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de varias líneas, sedes y equipos con colas, horarios y escalamiento _(propuesta)_
- [ ] Cumplimiento: consentimiento, bajas y límites de cada proveedor respetados y registrados _(propuesta)_
- [ ] Límites por plan y consumo medido (mensajes, conversaciones) _(propuesta)_

