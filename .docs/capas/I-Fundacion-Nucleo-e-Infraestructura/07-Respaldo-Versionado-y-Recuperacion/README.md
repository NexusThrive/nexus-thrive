---
id: I.07
capa: "I — FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
titulo: "Respaldo, versionado y recuperación"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# I.07 — Respaldo, versionado y recuperación

> Escalera de madurez de la subcapa **I.07**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `backups`, `restore-requests`, `exports` |
| Eventos (outbox → webhooks) | `backup.completed`, `backup.failed`, `export.ready` |
| MCP · lectura | `list_backups`, `get_export_status` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `request_export`, `request_restore` |
| Sistemas externos (puertos y adaptadores) | Almacenamiento de objetos (S3 / Vercel Blob) |

#### Integración

- [ ] API REST de lectura: backups, restore-requests, exports (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: backup.completed, backup.failed, export.ready (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_backups, get_export_status (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: request_export, request_restore (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de copias, retención y restauración

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Respaldo, versionado y recuperación»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Respaldo, versionado y recuperación»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `backups`, `restore-requests`, `exports`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `backup.completed`, `backup.failed`, `export.ready`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Copias de seguridad automáticas diarias

#### Funcionalidad

- [ ] Copias de seguridad automáticas diarias
- [ ] Copia de los archivos
- [ ] Retención básica

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Recuperación a punto en el tiempo y papelera

#### Funcionalidad

- [ ] Recuperación a un punto en el tiempo
- [ ] Papelera de reciclaje
- [ ] Versionado de documentos y de contenido
- [ ] Copias cifradas
- [ ] Exportación de datos
- [ ] Prueba de restauración periódica
- [ ] Migración de producción automatizada con respaldo y verificación _(scripts/migrate-prod.sh · docs/prod-sql/AUTOMATIZACION.md · PR #111 y #112; implementada, aún sin ejecutar en producción)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — RTO/RPO, copias inmutables y alta disponibilidad

#### Funcionalidad

- [ ] Objetivos definidos de recuperación
- [ ] Restauración por negocio
- [ ] Copias inmutables
- [ ] Alta disponibilidad
- [ ] Plan de recuperación ante desastres
- [ ] Monitoreo y alertas
- [ ] Retención y eliminación coherentes con la ley

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Planes de recuperación ante desastres y simulacros

#### Funcionalidad

- [ ] Multi-región activa
- [ ] Recuperación ante ransomware
- [ ] Retención configurable por cliente
- [ ] Ingeniería del caos
- [ ] Página de estado pública
- [ ] SLA contractuales
- [ ] Portabilidad total y migración asistida

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Multi-región activa y recuperación ante ransomware

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Respaldo, versionado y recuperación» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Portabilidad total, SLA contractuales y página de estado

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

