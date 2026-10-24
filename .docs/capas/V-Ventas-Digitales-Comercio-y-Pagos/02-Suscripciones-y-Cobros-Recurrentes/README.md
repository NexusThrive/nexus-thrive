---
id: V.02
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Suscripciones y cobros recurrentes"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# V.02 — Suscripciones y cobros recurrentes

> Escalera de madurez de la subcapa **V.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `subscriptions`, `plans`, `billing-cycles`, `dunning` |
| Eventos (outbox → webhooks) | `subscription.created`, `subscription.renewed`, `subscription.payment_failed`, `subscription.canceled` |
| MCP · lectura | `list_subscriptions`, `get_subscription` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_subscription`, `cancel_subscription` |
| Sistemas externos (puertos y adaptadores) | Pasarelas con cobro recurrente (Nequi, Wompi, Stripe) |

#### Integración

- [ ] API REST de lectura: subscriptions, plans, billing-cycles, dunning (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: subscription.created, subscription.renewed, subscription.payment_failed, subscription.canceled (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_subscriptions, get_subscription (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_subscription, cancel_subscription (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de ciclos, planes y renovaciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Suscripciones y cobros recurrentes básicos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N2 — Prorrateos, cambios de plan y estados de suscripción

#### Funcionalidad

- [x] Planes de suscripción
- [ ] Recordatorios antes del cobro
- [ ] Cobro recurrente con Nequi o la pasarela elegida, con autorización del cliente _(objetivo 2026 · ver `docs/PENDIENTES.md`)_

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con pagos, facturación y tenants

#### Funcionalidad

- [ ] Reintentos inteligentes
- [ ] Cambios de plan, pausas, cancelación
- [ ] Periodo de prueba
- [ ] Cuotas y financiación
- [ ] Reportes de recurrencia

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Renovaciones, reintentos y notificaciones automáticas

#### Funcionalidad

- [ ] Cobros por uso o por consumo
- [ ] Dunning con IA
- [ ] Débito automático bancario
- [ ] Facturación de la propia plataforma
- [ ] Descuentos, créditos y cupones recurrentes.
- [ ] Predicción de cancelación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Predicción de cancelación y recuperación de pagos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Motor de suscripciones y facturación recurrente a escala

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

