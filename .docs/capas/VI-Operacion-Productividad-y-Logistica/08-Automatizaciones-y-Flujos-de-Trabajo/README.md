---
id: VI.08
capa: "VI — OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
titulo: "Automatizaciones y flujos de trabajo"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# VI.08 — Automatizaciones y flujos de trabajo

> Escalera de madurez de la subcapa **VI.08**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `workflows`, `workflow-runs`, `triggers`, `connections` |
| Eventos (outbox → webhooks) | `workflow.run_completed`, `workflow.run_failed` |
| MCP · lectura | `list_workflows`, `get_run_status` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `trigger_workflow`, `pause_workflow` |
| Sistemas externos (puertos y adaptadores) | n8n (instancia propia o en la nube): nodo comunitario de NEXUS, disparadores por webhook y acciones por la API |

#### Integración

- [ ] API REST de lectura: workflows, workflow-runs, triggers, connections (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: workflow.run_completed, workflow.run_failed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_workflows, get_run_status (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: trigger_workflow, pause_workflow (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de reglas, disparadores y acciones

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Automatizaciones y flujos de trabajo»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Automatizaciones y flujos de trabajo»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `workflows`, `workflow-runs`, `triggers`, `connections`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `workflow.run_completed`, `workflow.run_failed`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Reglas simples con plantillas

#### Funcionalidad

- [ ] Reglas simples “si pasa X, haz Y”
- [ ] Activar y desactivar cada regla.
- [ ] Acciones básicas: enviar mensaje, crear tarea, cambiar estado, notificar al…
- [ ] n8n conectado a NEXUS por la API con llave del negocio (nunca a la base) _(objetivo 2026 · ver `docs/PENDIENTES.md`)_ _(PR-07)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Constructor visual de flujos

#### Funcionalidad

- [ ] Constructor visual
- [ ] Disparadores de todos los módulos
- [ ] Condiciones y filtros
- [ ] Esperas y programación
- [ ] Variables y plantillas
- [ ] Historial de ejecuciones
- [ ] Eventos de NEXUS hacia n8n con outbox transaccional y webhooks firmados _(objetivo 2026 · ver `docs/PENDIENTES.md`)_
- [ ] Panel de notificaciones dentro de la app, conectado al mismo registro de avisos _(propuesta)_
- [ ] Cada aviso sale por el canal que la persona eligió: WhatsApp, correo, notificación push o aviso en pantalla (toast) _(propuesta)_
- [ ] Preferencias por persona y por tipo de aviso; entrega registrada y reintento _(propuesta)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Ramas, bucles y aprobaciones humanas

#### Funcionalidad

- [ ] Ramas y bucles
- [ ] Aprobaciones humanas
- [ ] Permisos y entornos
- [ ] Límites y protección
- [ ] Webhooks entrantes y salientes
- [ ] Versionado de flujos
- [ ] Métricas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Webhooks, versionado y métricas de flujos

#### Funcionalidad

- [ ] Pasos con IA
- [ ] Agentes autónomos
- [ ] Conectores a miles de apps
- [ ] Biblioteca de flujos por vertical
- [ ] Orquestación entre negocios
- [ ] Observabilidad avanzada

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Pasos con IA y agentes autónomos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Automatizaciones y flujos de trabajo» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Orquestación empresarial y observabilidad avanzada

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

