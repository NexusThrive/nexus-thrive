---
id: VIII.04
capa: "VIII — TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO"
titulo: "Portal del empleado y autogestión"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VIII.04 — Portal del empleado y autogestión

> Escalera de madurez de la subcapa **VIII.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `employee-requests`, `payslip-downloads`, `profile-updates` |
| Eventos (outbox → webhooks) | `request.submitted`, `request.resolved` |
| MCP · lectura | `list_my_requests`, `get_my_payslips` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `submit_request` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: employee-requests, payslip-downloads, profile-updates (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: request.submitted, request.resolved (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_my_requests, get_my_payslips (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: submit_request (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de autoservicio y permisos del empleado

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Portal del empleado y autogestión»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Portal del empleado y autogestión»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `employee-requests`, `payslip-downloads`, `profile-updates`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `request.submitted`, `request.resolved`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Acceso a perfil y documentos básicos

#### Funcionalidad

- [ ] Portal del empleado

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Solicitudes, certificados y actualización de datos

#### Funcionalidad

- [ ] Desprendible de pago

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con asistencia, nómina y documentos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Cruce con asistencia, nómina y documentos del empleado _(propuesta)_
- [ ] Un solo registro de la persona (tercero con rol empleado) para todos los módulos _(propuesta)_
- [ ] Eventos al outbox cuando cambia el estado laboral _(propuesta)_


## N4 — Solicitudes, aprobaciones y notificaciones automatizadas

#### Funcionalidad

- [ ] Portal del empleado

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Asistencia inteligente y personalización del autoservicio

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Portal del empleado y autogestión» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Portal empresarial unificado de experiencia del empleado

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

