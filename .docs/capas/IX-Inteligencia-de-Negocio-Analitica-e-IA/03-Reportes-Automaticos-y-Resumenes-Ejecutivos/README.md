---
id: IX.03
capa: "IX — INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA"
titulo: "Reportes automáticos y resúmenes ejecutivos"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# IX.03 — Reportes automáticos y resúmenes ejecutivos

> Escalera de madurez de la subcapa **IX.03**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `reports`, `report-schedules`, `report-runs` |
| Eventos (outbox → webhooks) | `report.generated`, `report.delivered` |
| MCP · lectura | `list_reports`, `get_report` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `schedule_report` |
| Sistemas externos (puertos y adaptadores) | Correo / WhatsApp de entrega |

#### Integración

- [ ] API REST de lectura: reports, report-schedules, report-runs (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: report.generated, report.delivered (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_reports, get_report (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: schedule_report (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de reportes, destinatarios y periodicidad

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Generación de reportes básicos

#### Funcionalidad

- [ ] Resumen diario o semanal
- [ ] Programación
- [ ] Formato PDF o enlace

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Plantillas, filtros, exportaciones y comparativas

#### Funcionalidad

- [ ] Resumen por WhatsApp
- [ ] Reportes por destinatario
- [ ] Plantillas de reporte por vertical
- [ ] Reportes con filtros guardados
- [ ] Historial de envíos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración de fuentes y métricas corporativas

#### Funcionalidad

- [ ] Reportes condicionales
- [ ] Cierre automático diario y mensual
- [ ] Distribución por grupos y roles
- [ ] Reportes por cliente final
- [ ] Control de calidad del envío
- [ ] Reportes regulatorios y para el contador
- [ ] Programación avanzada

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Programación y distribución automatizada

#### Funcionalidad

- [ ] Informes redactados por IA
- [ ] Reportes interactivos por chat
- [ ] Reportes de voz
- [ ] Paquetes de informes mensuales
- [ ] Entrega personalizada
- [ ] Orquestación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Resúmenes ejecutivos y explicación de variaciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Sistema empresarial de información ejecutiva

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

