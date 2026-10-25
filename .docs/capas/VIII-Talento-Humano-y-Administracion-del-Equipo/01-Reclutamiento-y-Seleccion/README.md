---
id: VIII.01
capa: "VIII — TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO"
titulo: "Reclutamiento y selección"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VIII.01 — Reclutamiento y selección

> Escalera de madurez de la subcapa **VIII.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `job-openings`, `candidates`, `applications`, `interviews` |
| Eventos (outbox → webhooks) | `application.received`, `candidate.stage_changed`, `candidate.hired` |
| MCP · lectura | `list_candidates`, `get_opening` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_opening`, `move_candidate` |
| Sistemas externos (puertos y adaptadores) | Portales de empleo (Computrabajo, LinkedIn) |

#### Integración

- [ ] API REST de lectura: job-openings, candidates, applications, interviews (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: application.received, candidate.stage_changed, candidate.hired (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_candidates, get_opening (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_opening, move_candidate (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de vacantes, candidatos y etapas de selección

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Reclutamiento y selección»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Reclutamiento y selección»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `job-openings`, `candidates`, `applications`, `interviews`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `application.received`, `candidate.stage_changed`, `candidate.hired`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Vacantes, candidatos y estados simples

#### Funcionalidad

- [ ] Registro de vacantes
- [ ] Estados simples: recibido, entrevista, oferta, contratado, descartado.
- [ ] Convertir candidato en empleado

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Pipeline Kanban, bolsas de empleo y agenda de entrevistas

#### Funcionalidad

- [ ] Pipeline de selección tipo Kanban
- [ ] Página pública de vacantes
- [ ] Publicación en bolsas de empleo
- [ ] Agenda de entrevistas
- [ ] Plantillas de mensajes
- [ ] Checklist de onboarding
- [ ] Solicitud de documentos por enlace y firma del contrato en línea.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Pruebas, scorecards y verificación de referencias

#### Funcionalidad

- [ ] Pruebas y evaluaciones
- [ ] Scorecards de entrevista
- [ ] Verificación de referencias y antecedentes
- [ ] Aprobación de vacantes
- [ ] Onboarding por cargo y por vertical
- [ ] Periodo de prueba
- [ ] Base de talento
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Aprobación de vacantes y onboarding por cargo

#### Funcionalidad

- [ ] IA para preseleccionar hojas de vida
- [ ] Entrevista inicial por chatbot o por WhatsApp
- [ ] Contratación masiva y por temporada
- [ ] Programa de referidos de empleados
- [ ] Onboarding con ruta de aprendizaje
- [ ] Planificación de sucesión
- [ ] Marketplace de talento

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Preselección y entrevista inicial con IA

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Reclutamiento y selección» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Talento empresarial: contratación masiva, referidos y marketplace

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

