---
id: I.03
capa: "I — FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
titulo: "Permisos granulares y control de acceso (RBAC / ABAC)"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# I.03 — Permisos granulares y control de acceso (RBAC / ABAC)

> Escalera de madurez de la subcapa **I.03**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `roles`, `permissions`, `role-assignments` |
| Eventos (outbox → webhooks) | `role.changed`, `permission.denied (auditoría)` |
| MCP · lectura | `list_roles`, `explain_permission` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `assign_role` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: roles, permissions, role-assignments (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: role.changed, permission.denied (auditoría) (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_roles, explain_permission (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: assign_role (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de roles, permisos y políticas

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Roles y permisos básicos

#### Funcionalidad

- [x] Roles fijos
- [x] Un usuario, un negocio
- [x] Permisos por módulo

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Permisos granulares por recurso y acción

#### Funcionalidad

- [ ] Roles personalizables
- [ ] Permisos sobre datos sensibles
- [x] Suspensión y reactivación — _hecho: retirar integrante conserva su historial; se reactiva al volver a invitarlo_
- [ ] Plantillas de roles por vertical

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Control contextual por tenant, usuario y recurso

#### Funcionalidad

- [ ] Permisos por registro
- [ ] Segregación de funciones
- [ ] Aprobaciones y límites por monto
- [ ] Acceso temporal y delegado
- [ ] Revisión periódica de accesos
- [ ] Suplantación auditada del SuperAdmin

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Asignación y revisión automatizada de permisos

#### Funcionalidad

- [ ] Motor de políticas
- [ ] Roles heredados y jerarquías complejas
- [ ] Aprovisionamiento automático de usuarios
- [ ] Simulador de permisos
- [ ] Detección de privilegios riesgosos
- [ ] Gestión de partners y revendedores

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de privilegios excesivos y riesgos de acceso

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gobierno empresarial de identidades y acceso adaptativo

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

