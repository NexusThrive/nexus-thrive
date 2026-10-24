---
id: VIII.05
capa: "VIII — TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO"
titulo: "Formación, inducción y certificaciones"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VIII.05 — Formación, inducción y certificaciones

> Escalera de madurez de la subcapa **VIII.05**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `courses`, `enrollments`, `certifications`, `onboarding-plans` |
| Eventos (outbox → webhooks) | `course.completed`, `certification.expiring`, `onboarding.completed` |
| MCP · lectura | `list_courses`, `list_expiring_certifications` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `enroll_employee` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: courses, enrollments, certifications, onboarding-plans (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: course.completed, certification.expiring, onboarding.completed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_courses, list_expiring_certifications (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: enroll_employee (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de competencias, formación y requisitos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro de cursos y participantes

#### Funcionalidad

- [ ] Cursos con lecciones
- [ ] Asignar un curso a una persona o a un cargo.
- [ ] Marcar como completado

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Rutas formativas, evaluaciones y certificaciones

#### Funcionalidad

- [ ] Rutas de aprendizaje
- [ ] Evaluaciones
- [ ] Certificado automático
- [ ] Biblioteca de contenidos
- [ ] Asignación automática
- [ ] Recordatorios
- [ ] Vínculo con los SOP: confirmar lectura y comprensión.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con empleados, roles y documentos

#### Funcionalidad

- [ ] Capacitaciones obligatorias
- [ ] Matriz de competencias
- [ ] Control de asistencia a capacitaciones presenciales
- [ ] Cursos en vivo
- [ ] Reportes de cumplimiento
- [ ] Bloqueos opcionales
- [ ] Banco de preguntas
- [ ] Portal de contenidos para contratistas y proveedores.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Asignación, recordatorios y renovaciones automatizadas

#### Funcionalidad

- [ ] Generación de cursos y evaluaciones con IA
- [ ] Tutor IA
- [ ] Microaprendizaje por WhatsApp
- [ ] Gamificación
- [ ] Aprendizaje adaptativo
- [ ] Certificaciones externas
- [ ] LMS para clientes
- [ ] Análisis de impacto

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de competencias y brechas formativas

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de talento y desarrollo profesional

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

