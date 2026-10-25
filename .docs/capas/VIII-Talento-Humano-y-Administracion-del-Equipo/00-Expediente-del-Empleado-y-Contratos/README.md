---
id: VIII.00
capa: "VIII — TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO"
titulo: "Expediente del empleado y contratos"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VIII.00 — Expediente del empleado y contratos

> Escalera de madurez de la subcapa **VIII.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `employees`, `contracts`, `employee-documents` |
| Eventos (outbox → webhooks) | `employee.hired`, `employee.updated`, `contract.expiring`, `employee.terminated` |
| MCP · lectura | `list_employees`, `get_employee`, `list_expiring_contracts` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_employee`, `attach_document` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: employees, contracts, employee-documents (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: employee.hired, employee.updated, contract.expiring, employee.terminated (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_employees, get_employee, list_expiring_contracts (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_employee, attach_document (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de empleados, expedientes y relaciones laborales

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Expediente del empleado y contratos»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Expediente del empleado y contratos»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `employees`, `contracts`, `employee-documents`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `employee.hired`, `employee.updated`, `contract.expiring`, `employee.terminated`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro básico de empleados y contratos

#### Funcionalidad

- [ ] Ficha del empleado con documentos y datos básicos.
- [ ] Contratos
- [ ] Vacaciones
- [ ] Permisos, incapacidades y licencias
- [ ] Listado y búsqueda de empleados con alertas de vencimiento de contrato.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Expedientes, documentos, renovaciones y estados

#### Funcionalidad

- [ ] Prestaciones
- [ ] Novedades
- [ ] Liquidación de contrato
- [ ] Calendario de vacaciones

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con usuarios, documentos y nómina

#### Funcionalidad

- [ ] Dotación, EPP y SG-SST
- [ ] Gestión de incapacidades
- [ ] Flujos de aprobación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Alertas de vencimiento y flujos de contratación automatizados

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Alertas de vencimiento de contratos y documentos del equipo _(propuesta)_
- [ ] Flujo de contratación (candidato, contrato, alta) con aprobaciones _(propuesta)_
- [ ] Recordatorios de renovación de contrato _(propuesta)_


## N5 — Análisis de estructura laboral y detección de inconsistencias

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Maestro de datos». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Expediente del empleado y contratos» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de duplicados y de datos incompletos con puntaje de confianza; la fusión la aprueba una persona y es reversible _(propuesta)_
- [ ] Completar y normalizar datos desde fuentes externas, con la fuente y la fecha guardadas _(propuesta)_
- [ ] Medición de calidad del dato (completitud, duplicados, antigüedad) visible por organización _(propuesta)_


## N6 — Administración empresarial del ciclo de vida del empleado

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Maestro de datos». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación entre varias sedes o empresas de la misma persona, con permisos por organización _(propuesta)_
- [ ] Reglas de retención, anonimización y borrado a pedido (Ley 1581) _(propuesta)_
- [ ] Límites por plan y consumo medido, sin bloquear funciones _(propuesta)_

