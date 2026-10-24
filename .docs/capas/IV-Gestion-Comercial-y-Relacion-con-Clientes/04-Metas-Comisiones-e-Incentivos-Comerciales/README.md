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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Motor empresarial de compensación y auditoría

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

