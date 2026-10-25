---
id: I.06
capa: "I — FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
titulo: "Auditoría, trazabilidad y bitácora"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# I.06 — Auditoría, trazabilidad y bitácora

> Escalera de madurez de la subcapa **I.06**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `audit-logs (solo lectura)` |
| Eventos (outbox → webhooks) | `audit.sensitive_action` |
| MCP · lectura | `search_audit_log`, `get_audit_entry` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | — |
| Sistemas externos (puertos y adaptadores) | Exportación a SIEM / almacenamiento externo |

#### Integración

- [ ] API REST de lectura: audit-logs (solo lectura) (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: audit.sensitive_action (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: search_audit_log, get_audit_entry (N2) <!-- mcp-lectura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de auditoría y eventos registrables

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Auditoría, trazabilidad y bitácora»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Auditoría, trazabilidad y bitácora»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `audit-logs (solo lectura)`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `audit.sensitive_action`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro básico de acciones

#### Funcionalidad

- [x] Registro de acciones críticas — _hecho: `logTenantAction` (anular, borrar, roles, módulos, borrar negocio) + bitácora del panel_
- [ ] Inicios de sesión
- [x] Consulta simple — _hecho: Auditoría en `/admin/auditoria` (equipo NEXUS)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Historial detallado y filtros de auditoría

#### Funcionalidad

- [ ] Registro en todos los módulos
- [x] Búsqueda y filtros — _hecho: filtros en `/admin/auditoria`_
- [ ] Línea de tiempo por registro
- [ ] Dirección IP, dispositivo y ubicación aproximada
- [ ] Exportar
- [x] Registro de acciones del SuperAdmin — _hecho: bitácora del panel, incluida la suplantación_
- [ ] Historial y versiones de los recursos clave: qué cambió, quién y cuándo, con posibilidad de restaurar una versión _(propuesta)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Trazabilidad transversal entre módulos

#### Funcionalidad

- [ ] Bitácora inmutable
- [ ] Registro de lecturas sensibles
- [ ] Eventos de seguridad
- [ ] Registro de las acciones de la IA y las automatizaciones
- [ ] Retención configurable
- [ ] Alertas sobre eventos críticos
- [ ] Vista para auditor o revisor fiscal
- [ ] Soporte de solicitudes de titulares

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Alertas y conservación automatizada de registros

#### Funcionalidad

- [ ] Cumplimiento y certificaciones
- [ ] Envío a sistemas de seguridad (SIEM)
- [ ] Verificación de integridad
- [ ] Detección de comportamiento interno sospechoso
- [ ] Informes de cumplimiento automáticos
- [ ] Gestión de incidentes
- [ ] Auditoría por negocio y de plataforma
- [ ] Legal hold

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de patrones anómalos en la actividad

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Auditoría, trazabilidad y bitácora» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Auditoría empresarial, integridad y evidencia verificable

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

