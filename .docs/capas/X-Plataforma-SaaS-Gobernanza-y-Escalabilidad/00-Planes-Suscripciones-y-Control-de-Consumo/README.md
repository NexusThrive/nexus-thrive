---
id: X.00
capa: "X — PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD"
titulo: "Planes, suscripciones y control de consumo"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# X.00 — Planes, suscripciones y control de consumo

> Escalera de madurez de la subcapa **X.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `plans`, `activation-codes`, `entitlements`, `usage-meters`, `usage-events` |
| Eventos (outbox → webhooks) | `plan.changed`, `entitlement.changed`, `usage.threshold_reached`, `usage.limit_exceeded`, `activation_code.redeemed` |
| MCP · lectura | `get_entitlements`, `get_usage`, `list_plans` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `redeem_code`, `request_plan_change` |
| Sistemas externos (puertos y adaptadores) | Cobro del plan por pasarela (V.00, V.02) |

#### Integración

- [ ] API REST de lectura: plans, activation-codes, entitlements, usage-meters, usage-events (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: plan.changed, entitlement.changed, usage.threshold_reached, usage.limit_exceeded, activation_code.redeemed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_entitlements, get_usage, list_plans (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: redeem_code, request_plan_change (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de planes, límites y unidades de consumo

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Planes y asignación básica de suscripciones

#### Funcionalidad

- [x] Planes fijos — _hecho: catálogo en `/admin/planes`_
- [x] Cobro manual o por link de pago — _hecho: cobro manual con comprobante en `/admin/facturacion`_
- [ ] Estados de cuenta
- [x] Periodo de prueba — _hecho: códigos de acceso con días_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Límites, cuotas, estados y ciclo de facturación

#### Funcionalidad

- [ ] Cobro recurrente automático
- [x] Módulos como complementos — _hecho: plan Elite cobra por módulo_
- [x] Límites por plan — _hecho: usuarios por plan_
- [ ] Cambio de plan
- [ ] Facturas y recibos automáticos
- [ ] Reintentos de cobro y periodo de gracia
- [x] Panel de facturación — _hecho: `/admin/facturacion`_
- [x] Códigos de activación con precio, módulos y límites propios (contrato a medida) _(objetivo 2026)_ — _hecho: `/admin/beneficios` → `lib/benefits` (canje con suscripción activa y límites de usuarios y clientes)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con pagos, tenants y módulos habilitados

#### Funcionalidad

- [ ] Cobro por uso (medido)
- [ ] Costos pasados al cliente de forma transparente
- [ ] Descuentos, cupones, anualidades y precios especiales
- [ ] Facturación por moneda e impuestos
- [ ] Dunning (cobranza de suscripciones)
- [ ] Métricas de la plataforma
- [ ] Panel del SuperAdmin
- [ ] Reglas de suspensión y reactivación
- [ ] Cupos de uso por negocio: tokens de IA, ejecuciones de automatizaciones y mensajes _(objetivo 2026 · ver `docs/PENDIENTES.md`)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Renovaciones, límites y cambios de plan automatizados

#### Funcionalidad

- [ ] Motor de precios flexible
- [ ] Contratos y facturación empresarial
- [ ] Reparto de ingresos
- [ ] Optimización de ingresos
- [ ] Análisis de rentabilidad por cliente
- [ ] Previsión de ingresos y de costos
- [ ] Conciliación contable automática
- [ ] Marketplace de pagos para partners

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Optimización de consumo y recomendaciones de plan

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Plataforma empresarial de monetización y control de uso

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

