---
id: I.04
capa: "I — FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
titulo: "Multi-tenancy y aislamiento de datos"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# I.04 — Multi-tenancy y aislamiento de datos

> Escalera de madurez de la subcapa **I.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `tenants (el propio)`, `tenant-settings`, `tenant-modules` |
| Eventos (outbox → webhooks) | `tenant.created`, `tenant.module_toggled`, `tenant.suspended` |
| MCP · lectura | `get_tenant_context`, `list_active_modules` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `toggle_module` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: tenants (el propio), tenant-settings, tenant-modules (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: tenant.created, tenant.module_toggled, tenant.suspended (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_tenant_context, list_active_modules (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: toggle_module (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de tenants y límites de aislamiento

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro y resolución de tenants

#### Funcionalidad

- [x] Modelo multi-tenant estricto
- [x] Identidad unificada
- [x] Catálogo de permisos y módulos
- [x] Configuración por negocio
- [ ] Medición de uso _(PR-05)_
- [x] Aislamiento total de datos

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Aislamiento de consultas y operaciones por tenant

#### Funcionalidad

- [ ] Un usuario en varios negocios
- [ ] Sedes y equipos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración transversal de contexto de tenant

#### Funcionalidad

- [ ] Jerarquía de organizaciones

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Aprovisionamiento y configuración automatizada de tenants

#### Funcionalidad

- [ ] Aislamiento reforzado por cliente

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Optimización inteligente de recursos por tenant

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Aislamiento empresarial avanzado y escalabilidad horizontal

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

