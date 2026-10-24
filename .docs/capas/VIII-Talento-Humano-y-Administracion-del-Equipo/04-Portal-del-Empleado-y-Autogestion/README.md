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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N4 — Solicitudes, aprobaciones y notificaciones automatizadas

#### Funcionalidad

- [ ] Portal del empleado

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Asistencia inteligente y personalización del autoservicio

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Portal empresarial unificado de experiencia del empleado

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

