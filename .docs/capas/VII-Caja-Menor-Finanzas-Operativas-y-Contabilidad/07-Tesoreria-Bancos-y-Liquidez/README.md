---
id: VII.07
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Tesorería, bancos y liquidez"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VII.07 — Tesorería, bancos y liquidez

> Escalera de madurez de la subcapa **VII.07**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `bank-accounts`, `bank-transactions`, `reconciliations`, `cash-forecast` |
| Eventos (outbox → webhooks) | `bank_transaction.imported`, `reconciliation.matched`, `liquidity.low` |
| MCP · lectura | `get_cash_forecast`, `list_unreconciled` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `match_transaction`, `import_statement` |
| Sistemas externos (puertos y adaptadores) | Bancos (extractos, Open Finance cuando exista), pasarelas |

#### Integración

- [ ] API REST de lectura: bank-accounts, bank-transactions, reconciliations, cash-forecast (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: bank_transaction.imported, reconciliation.matched, liquidity.low (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_cash_forecast, list_unreconciled (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: match_transaction, import_statement (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de tesorería, bancos y posiciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Caja y bancos: ingresos, egresos y saldos

#### Funcionalidad

- [ ] Caja y bancos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Conciliación bancaria, recaudos y pagos programados

#### Funcionalidad

- [ ] Conciliación bancaria
- [ ] Flujo de caja proyectado

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Aprobaciones, dispersión de pagos y flujo de caja

#### Funcionalidad

- [ ] Aprobación de pagos
- [ ] Dispersión de pagos
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Cobranza estructurada, anticipos y provisiones

#### Funcionalidad

- [ ] Tesorería multi-banco y multi-moneda
- [ ] Proyección de flujo de caja con IA
- [ ] Factoring, financiación y cupos bancarios
- [ ] Débito automático, mandatos y cobros recurrentes
- [ ] Portal de pagos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Tesorería multi-banco y flujo de caja con IA

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Financiación, débito automático y portal de pagos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

