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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Permisos granulares y control de acceso (RBAC / ABAC)»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Permisos granulares y control de acceso (RBAC / ABAC)»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `roles`, `permissions`, `role-assignments`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `role.changed`, `permission.denied (auditoría)`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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
- [ ] Motor de aprobaciones genérico: cada función declara qué se aprueba y quién puede; el motor solo gestiona el flujo _(propuesta)_
- [ ] Segregación de funciones: quien crea no aprueba lo suyo cuando la regla lo exige _(propuesta)_

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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Permisos granulares y control de acceso (RBAC / ABAC)» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Gobierno empresarial de identidades y acceso adaptativo

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

