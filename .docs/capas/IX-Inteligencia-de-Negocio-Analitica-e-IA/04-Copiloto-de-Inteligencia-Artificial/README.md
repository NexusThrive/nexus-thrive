---
id: IX.04
capa: "IX — INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA"
titulo: "Copiloto de inteligencia artificial"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# IX.04 — Copiloto de inteligencia artificial

> Escalera de madurez de la subcapa **IX.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `copilot-sessions`, `copilot-actions (aprobaciones)`, `tools (catálogo)` |
| Eventos (outbox → webhooks) | `copilot.action_proposed`, `copilot.action_approved`, `copilot.action_rejected` |
| MCP · lectura | `list_tools`, `get_business_summary` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `propose_action`, `approve_action` |
| Sistemas externos (puertos y adaptadores) | Servidor MCP de NEXUS (esta subcapa lo consume y lo expone) |

#### Integración

- [ ] API REST de lectura: copilot-sessions, copilot-actions (aprobaciones), tools (catálogo) (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: copilot.action_proposed, copilot.action_approved, copilot.action_rejected (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_tools, get_business_summary (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: propose_action, approve_action (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de casos de uso, datos y límites de IA

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Asistente de consultas y respuestas básicas

#### Funcionalidad

- [ ] Asistente de consultas básicas
- [ ] Resumen de una conversación
- [ ] Redacción asistida
- [x] Agente de consulta de solo lectura: ventas, caja, clientes e inventario con datos reales _(objetivo 2026 · ver `docs/PENDIENTES.md`)_ _(PR-04)_ _hecho: lib/mcp/server.ts + app/api/mcp (solo lectura)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Contexto de negocio y consulta de información autorizada

#### Funcionalidad

- [ ] Asistente integrado en la app
- [ ] Resúmenes automáticos
- [ ] Sugerencias simples
- [ ] Búsqueda inteligente
- [ ] Acceso por WhatsApp
- [ ] Respeta permisos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con herramientas y módulos empresariales

#### Funcionalidad

- [ ] Acciones con confirmación
- [ ] Base de conocimiento por negocio
- [ ] Resúmenes diarios proactivos
- [ ] Explicaciones
- [ ] Controles y límites
- [ ] Registro de cada consulta y acción
- [ ] Retroalimentación
- [ ] El agente prepara acciones (recordatorios, mensajes, tareas) y una persona las aprueba _(objetivo 2026 · ver `docs/PENDIENTES.md`)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Ejecución supervisada de tareas y flujos

#### Funcionalidad

- [ ] Agentes autónomos
- [ ] Copiloto por rol
- [ ] Análisis profundo de negocio
- [ ] Memoria de largo plazo
- [ ] Multimodal
- [ ] Evaluación continua
- [ ] Asistente configurable por negocio
- [ ] Modelos propios o afinados

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Razonamiento sobre métricas y recomendaciones contextualizadas

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Plataforma empresarial de IA gobernada y auditable

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

