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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Talento empresarial: contratación masiva, referidos y marketplace

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

