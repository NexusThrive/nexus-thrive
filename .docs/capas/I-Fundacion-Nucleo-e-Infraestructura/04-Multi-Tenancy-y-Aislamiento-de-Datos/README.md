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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Multi-tenancy y aislamiento de datos»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Multi-tenancy y aislamiento de datos»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `tenants (el propio)`, `tenant-settings`, `tenant-modules`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `tenant.created`, `tenant.module_toggled`, `tenant.suspended`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro y resolución de tenants

#### Funcionalidad

- [x] Modelo multi-tenant estricto
- [x] Identidad unificada
- [x] Catálogo de permisos y módulos
- [x] Configuración por negocio
- [x] Medición de uso _(PR-05)_ _hecho: lib/usage/meters.ts (UsageCounter, cupo mensual con 429) y origen en la bitácora (lib/operations/audit.ts)_
- [x] Aislamiento total de datos

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Aislamiento de consultas y operaciones por tenant

#### Funcionalidad

- [ ] Un usuario en varios negocios
- [ ] Sedes y equipos
- [ ] Una organización con varias sedes y una persona con varias organizaciones, con datos y permisos separados _(propuesta)_

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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Multi-tenancy y aislamiento de datos» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Aislamiento empresarial avanzado y escalabilidad horizontal

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

