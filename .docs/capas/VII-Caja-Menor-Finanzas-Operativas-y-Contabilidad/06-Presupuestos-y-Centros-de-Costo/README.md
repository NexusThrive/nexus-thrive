---
id: VII.06
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Presupuestos y centros de costo"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# VII.06 — Presupuestos y centros de costo

> Escalera de madurez de la subcapa **VII.06**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `budgets`, `cost-centers`, `budget-lines`, `budget-variance` |
| Eventos (outbox → webhooks) | `budget.exceeded`, `budget.approved` |
| MCP · lectura | `get_budget_variance`, `list_cost_centers` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_budget`, `reassign_cost_center` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: budgets, cost-centers, budget-lines, budget-variance (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: budget.exceeded, budget.approved (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_budget_variance, list_cost_centers (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_budget, reassign_cost_center (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento presupuestal y estructura de costos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Presupuestos y centros de costo»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Presupuestos y centros de costo»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `budgets`, `cost-centers`, `budget-lines`, `budget-variance`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `budget.exceeded`, `budget.approved`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro básico de presupuestos

#### Funcionalidad

- [x] Centros de costo y sucursales _(PR-21)_
- [ ] Reporte de gasto e ingreso por centro de costo.
- [x] Lista de categorías — _hecho: categorías de gasto_
- [x] Filtro y total por categoría. — _hecho: filtro por categoría en Finanzas_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Partidas, periodos, centros de costo y ejecuciones

#### Funcionalidad

- [ ] Presupuesto por área, sede o proyecto
- [ ] Comparativo presupuesto vs. ejecutado
- [ ] Proyectos y obras
- [ ] Imputación de gastos
- [ ] Alertas de sobreejecución
- [ ] Categorías y subcategorías
- [ ] Centros de costo, proyectos y sedes
- [ ] Plantillas por vertical
- [ ] Reporte de gasto por categoría, centro de costo y periodo.
- [ ] Vínculo con obra o proyecto

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con contabilidad, compras y operaciones

#### Funcionalidad

- [ ] Gestión completa de proyectos y obras
- [ ] Presupuesto comprometido
- [ ] Reparto de costos indirectos
- [ ] Proyección de costo final y de margen
- [ ] Aprobación de cambios
- [ ] Flujo de caja por proyecto.
- [ ] Presupuesto mensual por categoría y por centro de costo
- [ ] Alertas de sobreejecución
- [ ] Cuentas contables (PUC) por categoría
- [ ] Reglas de imputación
- [ ] Categorías bloqueadas o restringidas
- [ ] Comparativo presupuesto vs. real

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Alertas de desviación y controles presupuestales automatizados

#### Funcionalidad

- [ ] Planeación financiera multi-periodo y por escenarios
- [ ] Valor ganado (EVM)
- [ ] Portafolio de proyectos
- [ ] Presupuesto base cero y rolling forecast.
- [ ] Simulaciones
- [ ] Benchmarks
- [ ] Presupuestos multi-periodo y por escenarios
- [ ] Pronóstico de gasto
- [ ] Costeo por actividad
- [ ] Reglas de reclasificación masiva
- [ ] Benchmarks anónimos
- [ ] Reparto entre empresas del grupo

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Proyecciones financieras y análisis de escenarios

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Presupuestos y centros de costo» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Planeación financiera empresarial y control multidimensional

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

