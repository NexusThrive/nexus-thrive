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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Reportes automáticos y resúmenes ejecutivos»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Reportes automáticos y resúmenes ejecutivos»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `reports`, `report-schedules`, `report-runs`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `report.generated`, `report.delivered`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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
- [ ] Cada recurso se exporta e importa en CSV, Excel, PDF y JSON desde el mismo motor, con las mismas columnas que la pantalla _(propuesta)_
- [ ] Importación con validación previa, vista de errores por fila y posibilidad de deshacer _(propuesta)_

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
- [ ] Envío programado de reportes (correo y WhatsApp) con destinatarios, frecuencia y formato elegidos por la organización _(propuesta)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Resúmenes ejecutivos y explicación de variaciones

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Analítico e inteligente». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Reportes automáticos y resúmenes ejecutivos» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Consulta en lenguaje natural sobre las métricas definidas, mostrando la definición usada _(propuesta)_
- [ ] Explicación de variaciones (qué cambió y por qué) citando las fuentes _(propuesta)_
- [ ] Pronóstico con intervalo de confianza y comparación contra lo ocurrido _(propuesta)_


## N6 — Sistema empresarial de información ejecutiva

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Analítico e inteligente». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Métricas consolidadas entre sedes y empresas con permisos por dato _(propuesta)_
- [ ] Gobierno del dato: propietario, definición única y registro de cambios de cada métrica _(propuesta)_
- [ ] Rendimiento: caché y precálculo para que las consultas grandes no frenen la operación _(propuesta)_

