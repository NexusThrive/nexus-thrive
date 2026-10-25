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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Copiloto de inteligencia artificial»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Copiloto de inteligencia artificial»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `copilot-sessions`, `copilot-actions (aprobaciones)`, `tools (catálogo)`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `copilot.action_proposed`, `copilot.action_approved`, `copilot.action_rejected`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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
- [ ] Cada función se puede consultar y operar por la API y por el MCP con permiso explícito, para que un agente o un flujo de n8n controle lo que una persona haría en pantalla _(propuesta)_
- [ ] Ejemplos de flujos de n8n publicados para las operaciones más usadas, con pruebas de contrato _(propuesta)_

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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Analítico e inteligente». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Copiloto de inteligencia artificial» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Consulta en lenguaje natural sobre las métricas definidas, mostrando la definición usada _(propuesta)_
- [ ] Explicación de variaciones (qué cambió y por qué) citando las fuentes _(propuesta)_
- [ ] Pronóstico con intervalo de confianza y comparación contra lo ocurrido _(propuesta)_


## N6 — Plataforma empresarial de IA gobernada y auditable

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Analítico e inteligente». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Métricas consolidadas entre sedes y empresas con permisos por dato _(propuesta)_
- [ ] Gobierno del dato: propietario, definición única y registro de cambios de cada métrica _(propuesta)_
- [ ] Rendimiento: caché y precálculo para que las consultas grandes no frenen la operación _(propuesta)_

