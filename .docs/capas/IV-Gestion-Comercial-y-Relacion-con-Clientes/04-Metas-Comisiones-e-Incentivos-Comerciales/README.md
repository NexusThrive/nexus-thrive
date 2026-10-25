---
id: IV.04
capa: "IV — GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES"
titulo: "Metas, comisiones e incentivos comerciales"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# IV.04 — Metas, comisiones e incentivos comerciales

> Escalera de madurez de la subcapa **IV.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `goals`, `commissions`, `incentive-rules` |
| Eventos (outbox → webhooks) | `goal.reached`, `commission.calculated` |
| MCP · lectura | `get_goal_progress`, `list_commissions` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `set_goal` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: goals, commissions, incentive-rules (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: goal.reached, commission.calculated (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_goal_progress, list_commissions (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: set_goal (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de reglas, objetivos y compensaciones

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Metas, comisiones e incentivos comerciales»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Metas, comisiones e incentivos comerciales»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `goals`, `commissions`, `incentive-rules`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `goal.reached`, `commission.calculated`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro básico de comisiones

#### Funcionalidad

- [ ] Responsable asignado
- [ ] Lista de contactos por vendedor.
- [ ] Exportar

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Tablas de comisiones, periodos y liquidaciones

#### Funcionalidad

- [ ] Roles básicos
- [ ] Visibilidad
- [ ] Metas mensuales por vendedor
- [ ] Reportes simples
- [ ] Comisión básica

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con ventas, pagos y equipo comercial

#### Funcionalidad

- [ ] Roles y permisos finos
- [ ] Metas y comisiones por vendedor
- [ ] Reportes comerciales
- [ ] Tableros por rol
- [ ] Liquidación de comisiones
- [ ] Transparencia
- [ ] Control de exportaciones y de acceso a datos sensibles

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Cálculo, aprobación y liquidación automatizados

#### Funcionalidad

- [ ] Gestión de territorios y cuentas
- [ ] Esquemas complejos de compensación
- [ ] Análisis de desempeño con IA
- [ ] Competencias y capacitación comercial
- [ ] Canales externos
- [ ] Comparativos entre sedes y negocios del grupo.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Simulación de incentivos y análisis de rendimiento

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Metas, comisiones e incentivos comerciales» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Motor empresarial de compensación y auditoría

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

