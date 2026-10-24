---
id: III.01
capa: "III — ATENCIÓN Y COMUNICACIÓN"
titulo: "Agentes conversacionales e inteligencia artificial"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# III.01 — Agentes conversacionales e inteligencia artificial

> Escalera de madurez de la subcapa **III.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `agents`, `agent-runs`, `knowledge-sources`, `handoffs` |
| Eventos (outbox → webhooks) | `agent.replied`, `agent.handoff_requested`, `agent.run_failed` |
| MCP · lectura | `list_agent_runs`, `get_agent_config` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `update_agent_instructions`, `request_handoff` |
| Sistemas externos (puertos y adaptadores) | Proveedores de modelos de IA (Claude, etc.), vía puerto |

#### Integración

- [ ] API REST de lectura: agents, agent-runs, knowledge-sources, handoffs (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: agent.replied, agent.handoff_requested, agent.run_failed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_agent_runs, get_agent_config (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: update_agent_instructions, request_handoff (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de agentes, instrucciones y límites operativos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Asistente conversacional básico

#### Funcionalidad

- [x] Respuestas rápidas / plantillas — _hecho: plantillas del módulo WhatsApp_
- [ ] Menú de opciones simple (1\. Reservas, 2\. Precios, 3\. Hablar con alguien).

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Agentes con contexto, herramientas y conocimiento

#### Funcionalidad

- [ ] Flujos configurables
- [ ] FAQ automáticas
- [ ] Chatbot con IA básica
- [ ] Asistente del negocio por WhatsApp: número vinculado al negocio e integrante verificado _(objetivo 2026 · ver `docs/PENDIENTES.md`)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con CRM, canales y módulos de negocio

#### Funcionalidad

- [ ] IA con base de conocimiento (RAG)
- [ ] Acciones del bot
- [ ] Reglas de escalamiento
- [ ] Registro de conversaciones del bot
- [ ] Resumen automático

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Automatización de tareas y escalamiento a humanos

#### Funcionalidad

- [ ] Agentes IA autónomos
- [ ] Voz con IA
- [ ] Memoria del cliente
- [ ] Campañas conversacionales
- [ ] Evaluación y entrenamiento continuo
- [ ] Guardarraíles

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Agentes especializados, evaluación y mejora continua

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Orquestación empresarial de agentes con controles de seguridad

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

