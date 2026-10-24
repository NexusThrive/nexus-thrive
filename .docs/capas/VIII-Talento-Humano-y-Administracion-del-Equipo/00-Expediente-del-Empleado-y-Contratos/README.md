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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N5 — Análisis de estructura laboral y detección de inconsistencias

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Administración empresarial del ciclo de vida del empleado

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

