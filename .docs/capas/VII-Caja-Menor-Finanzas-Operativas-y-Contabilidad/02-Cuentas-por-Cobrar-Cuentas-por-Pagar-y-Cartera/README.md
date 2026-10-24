---
id: VII.02
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Cuentas por cobrar, cuentas por pagar y cartera"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VII.02 — Cuentas por cobrar, cuentas por pagar y cartera

> Escalera de madurez de la subcapa **VII.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `receivables`, `payables`, `aging`, `collection-reminders`, `payments-applied` |
| Eventos (outbox → webhooks) | `receivable.created`, `receivable.overdue`, `payable.due`, `payment.applied` |
| MCP · lectura | `get_receivables_aging`, `list_overdue_customers`, `list_payables_due` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `apply_payment`, `send_collection_reminder` |
| Sistemas externos (puertos y adaptadores) | Bancos (conciliación), WhatsApp / correo para recordatorios |

#### Integración

- [ ] API REST de lectura: receivables, payables, aging, collection-reminders, payments-applied (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: receivable.created, receivable.overdue, payable.due, payment.applied (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_receivables_aging, list_overdue_customers, list_payables_due (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: apply_payment, send_collection_reminder (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de obligaciones, vencimientos y saldos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro básico de cuentas por cobrar y pagar

#### Funcionalidad

- [x] Cuentas por cobrar _hecho: receiveInvoicePayment + /cartera (abonos, saldo, antigüedad)_
- [x] Cuentas por pagar _hecho: paySupplierInvoice + SupplierPayment_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Vencimientos, abonos, saldos y estados de cartera

#### Funcionalidad

- [ ] Cartera por edades
- [ ] Recaudos aplicados a facturas
- [ ] Pagos a proveedores
- [ ] Recordatorios de cobro

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con ventas, compras, facturación y pagos

#### Funcionalidad

- [ ] Cobranza estructurada
- [ ] Anticipos, cruces y compensaciones
- [ ] Provisión de cartera
- [ ] Retenciones practicadas y sufridas
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Recordatorios, aplicación de pagos y conciliación automatizados

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N5 — Predicción de recaudo y análisis de riesgo de cartera

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión financiera empresarial de obligaciones y liquidez

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

