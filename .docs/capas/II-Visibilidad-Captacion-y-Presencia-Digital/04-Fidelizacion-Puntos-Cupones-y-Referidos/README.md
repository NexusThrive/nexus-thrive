---
id: II.04
capa: "II — VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL"
titulo: "Fidelización, puntos, cupones y referidos"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# II.04 — Fidelización, puntos, cupones y referidos

> Escalera de madurez de la subcapa **II.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `loyalty-programs`, `points-ledger`, `coupons`, `referrals` |
| Eventos (outbox → webhooks) | `points.earned`, `points.redeemed`, `coupon.redeemed`, `referral.converted` |
| MCP · lectura | `get_customer_points`, `list_coupons` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `grant_points`, `create_coupon` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: loyalty-programs, points-ledger, coupons, referrals (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: points.earned, points.redeemed, coupon.redeemed, referral.converted (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_customer_points, list_coupons (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: grant_points, create_coupon (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de fidelización y reglas de recompensa

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro de clientes y recompensas básicas

#### Funcionalidad

- [ ] Cupones de descuento
- [ ] Registro de clientes frecuentes
- [x] Membresías simples — _hecho: módulo Membresías_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Puntos, niveles, canjes y referidos

#### Funcionalidad

- [ ] Programa de puntos
- [ ] Referidos
- [ ] Membresías con cobro recurrente
- [ ] Cupones por segmento
- [x] Tarjeta digital o QR de cliente — _hecho: carné `/crm/{id}/carnet` con QR y NFC_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con CRM, ventas y pagos

#### Funcionalidad

- [ ] Niveles o categorías
- [ ] Reglas de canje y expiración
- [ ] Antifraude
- [ ] Automatizaciones
- [ ] Paquetes y bonos prepagados
- [ ] Reportes
- [ ] Contabilidad de pasivos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Acumulación, vencimientos y recompensas automatizadas

#### Funcionalidad

- [ ] Fidelización personalizada con IA
- [ ] Gamificación
- [ ] Programas entre negocios
- [ ] Billetera digital
- [ ] Suscripciones con pausa, cambio de plan y recuperación de cobros fallidos.
- [ ] Análisis de LTV y churn

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Segmentación y personalización de incentivos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Ecosistema avanzado de fidelización y referidos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

