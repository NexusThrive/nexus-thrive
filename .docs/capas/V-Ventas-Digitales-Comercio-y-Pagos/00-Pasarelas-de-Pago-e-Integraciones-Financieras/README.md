---
id: V.00
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Pasarelas de pago e integraciones financieras"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# V.00 — Pasarelas de pago e integraciones financieras

> Escalera de madurez de la subcapa **V.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `payment-providers`, `payment-intents`, `payments`, `refunds`, `reconciliations` |
| Eventos (outbox → webhooks) | `payment.created`, `payment.confirmed`, `payment.failed`, `payment.refunded`, `reconciliation.completed` |
| MCP · lectura | `list_payments`, `get_payment`, `get_reconciliation` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_payment_intent`, `refund_payment` |
| Sistemas externos (puertos y adaptadores) | Nequi, Wompi, Bold, MercadoPago, PSE, Stripe; cada uno detrás de un puerto de pagos con webhook entrante verificado e idempotente |

#### Integración

- [ ] API REST de lectura: payment-providers, payment-intents, payments, refunds, reconciliations (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: payment.created, payment.confirmed, payment.failed, payment.refunded, reconciliation.completed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_payments, get_payment, get_reconciliation (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_payment_intent, refund_payment (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de pagos, proveedores y estados

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Integración con una pasarela de pago

#### Funcionalidad

- [ ] Una pasarela (Wompi o la que elijas) conectada _(PR-06)_
- [ ] Pago con tarjeta, PSE y Nequi desde un checkout alojado por la pasarela. _(PR-17)_
- [x] Confirmación de pago por webhook y estado visible en la orden. _(PR-17)_
- [ ] Nequi Negocios: QR dinámico e intención de cobro; solo se registra el ingreso con el estado oficial _(objetivo 2026 · ver `docs/PENDIENTES.md`)_ _(PR-17)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión de transacciones, errores y conciliación básica

#### Funcionalidad

- [x] Varias pasarelas _(PR-19)_
- [ ] Métodos locales completos
- [x] Reembolsos totales y parciales _(PR-17)_
- [ ] Pagos parciales y depósitos
- [x] Conciliación diaria _(PR-17)_
- [ ] Cuotas y pagos en moneda extranjera según la pasarela.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con múltiples proveedores y módulos

#### Funcionalidad

- [ ] Enrutamiento entre pasarelas
- [ ] Registro de comisiones
- [ ] Gestión de contracargos
- [ ] Reintentos de cobros fallidos
- [ ] Pagos divididos
- [ ] Límites y aprobaciones
- [ ] Reportes de aprobación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Webhooks, reintentos y conciliación automatizada

#### Funcionalidad

- [ ] Modelo de plataforma de pagos
- [ ] Pagos a terceros y dispersión
- [ ] Tokenización de tarjeta
- [ ] Antifraude con reglas e IA
- [ ] Billetera interna y saldo a favor.
- [ ] Conciliación automática con el banco
- [ ] Otros rieles

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de anomalías y optimización de pagos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Orquestación de pagos empresarial y resiliencia

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

