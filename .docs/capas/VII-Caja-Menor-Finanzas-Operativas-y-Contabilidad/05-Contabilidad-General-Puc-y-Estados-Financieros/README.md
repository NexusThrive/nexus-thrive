---
id: VII.05
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Contabilidad general, PUC y estados financieros"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VII.05 — Contabilidad general, PUC y estados financieros

> Escalera de madurez de la subcapa **VII.05**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `chart-of-accounts`, `journal-entries`, `ledgers`, `financial-statements`, `accounting-exports` |
| Eventos (outbox → webhooks) | `journal_entry.posted`, `period.closed`, `export.ready` |
| MCP · lectura | `get_trial_balance`, `get_financial_statement` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `post_journal_entry`, `close_period` |
| Sistemas externos (puertos y adaptadores) | Exportación al contador (Siigo, World Office, Alegra, archivos planos) |

#### Integración

- [ ] API REST de lectura: chart-of-accounts, journal-entries, ledgers, financial-statements, accounting-exports (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: journal_entry.posted, period.closed, export.ready (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_trial_balance, get_financial_statement (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: post_journal_entry, close_period (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento contable, plan de cuentas y periodos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro básico de cuentas y asientos

#### Funcionalidad

- [ ] Reportes simples _(PR-23)_
- [ ] Exportación _(PR-23)_
- [ ] Categorías de ingresos y gastos.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Libro diario, mayor, comprobantes y cierres

#### Funcionalidad

- [ ] Plan de cuentas (PUC) _(PR-21)_
- [ ] Asientos automáticos _(PR-22)_
- [ ] Comprobantes contables manuales
- [ ] Libros auxiliares, libro diario, libro mayor y balance de prueba. _(PR-23)_
- [ ] Terceros y centros de costo en cada asiento _(PR-22)_
- [ ] Reportes para el contador _(PR-23)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con ventas, compras, pagos e impuestos

#### Funcionalidad

- [ ] Estados financieros
- [ ] Cierre contable por periodos
- [ ] Activos fijos
- [ ] Diferidos, provisiones y causaciones
- [ ] Conciliación entre módulos y contabilidad
- [ ] Ajustes por inflación y por diferencia en cambio
- [ ] Soporte de NIIF

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Generación automática de asientos y conciliaciones

#### Funcionalidad

- [ ] Multiempresa y consolidación
- [ ] Costeo avanzado
- [ ] Contabilidad multi-libro o multi-norma
- [ ] Rentabilidad por cliente, producto, canal, proyecto y sede
- [ ] Cierre asistido con IA
- [ ] Auditoría externa y revisoría fiscal
- [ ] Integración bidireccional con Siigo, Alegra y World Office

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis contable y detección de anomalías

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Contabilidad empresarial multientidad y cierres controlados

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

