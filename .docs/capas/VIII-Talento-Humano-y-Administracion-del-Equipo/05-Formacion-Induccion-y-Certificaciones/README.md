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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Formación, inducción y certificaciones»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Formación, inducción y certificaciones»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `courses`, `enrollments`, `certifications`, `onboarding-plans`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `course.completed`, `certification.expiring`, `onboarding.completed`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Formación, inducción y certificaciones» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Gestión empresarial de talento y desarrollo profesional

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

