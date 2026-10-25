---
id: IX.01
capa: "IX — INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA"
titulo: "Modelo semántico y catálogo de métricas"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# IX.01 — Modelo semántico y catálogo de métricas

> Escalera de madurez de la subcapa **IX.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `metrics`, `metric-definitions`, `dimensions` |
| Eventos (outbox → webhooks) | `metric.definition_changed` |
| MCP · lectura | `list_metrics`, `query_metric`, `explain_metric` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | — |
| Sistemas externos (puertos y adaptadores) | Exportación a BI externo (Metabase, Looker Studio) |

#### Integración

- [ ] API REST de lectura: metrics, metric-definitions, dimensions (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: metric.definition_changed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_metrics, query_metric, explain_metric (N2) <!-- mcp-lectura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de entidades, métricas y definiciones

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Modelo semántico y catálogo de métricas»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Modelo semántico y catálogo de métricas»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `metrics`, `metric-definitions`, `dimensions`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `metric.definition_changed`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Catálogo básico de indicadores

#### Funcionalidad

- [ ] Capa de datos unificada
- [ ] Modelo semántico / catálogo de métricas
- [x] Eventos y cronología del cliente — _hecho: línea de tiempo en la ficha 360°_
- [x] Aislamiento multi-tenant — _hecho: contexto del negocio en el servidor + FK a `Tenant` + RLS_
- [x] Permisos sobre datos — _hecho: matriz `lib/business/permissions.ts`_
- [ ] Calidad de datos
- [x] Motor de notificaciones — _hecho: avisos derivados en la barra (vencimientos, stock bajo, citas)_
- [ ] Registro inmutable de eventos del sistema

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Definiciones, fórmulas, dimensiones y propietarios

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Catálogo de métricas con definición, fórmula, dimensiones y propietario _(propuesta)_
- [ ] Versionado de la fórmula: un cambio no reescribe el pasado sin avisar _(propuesta)_
- [ ] Glosario visible donde se muestra cada cifra _(propuesta)_


## N3 — Integración y normalización de fuentes de datos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Las métricas leen de servicios (ventas, cobros, citas, inventario) y no de consultas sueltas _(propuesta)_
- [ ] Zona horaria y moneda normalizadas en todas las fuentes _(propuesta)_
- [ ] Reconciliación de cada métrica contra su fuente _(propuesta)_


## N4 — Validación y actualización automatizada de métricas

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Validación automática: comparar la métrica contra un control y avisar si difiere _(propuesta)_
- [ ] Alerta cuando una métrica cambia sin una causa registrada _(propuesta)_
- [ ] Recálculo programado y caché con invalidación por evento _(propuesta)_


## N5 — Análisis de calidad, linaje y consistencia semántica

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Analítico e inteligente». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Modelo semántico y catálogo de métricas» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Consulta en lenguaje natural sobre las métricas definidas, mostrando la definición usada _(propuesta)_
- [ ] Explicación de variaciones (qué cambió y por qué) citando las fuentes _(propuesta)_
- [ ] Pronóstico con intervalo de confianza y comparación contra lo ocurrido _(propuesta)_


## N6 — Capa semántica empresarial gobernada y reutilizable

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Analítico e inteligente». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Métricas consolidadas entre sedes y empresas con permisos por dato _(propuesta)_
- [ ] Gobierno del dato: propietario, definición única y registro de cambios de cada métrica _(propuesta)_
- [ ] Rendimiento: caché y precálculo para que las consultas grandes no frenen la operación _(propuesta)_

