---
id: VII.01
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Vales, anticipos y legalizaciones"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VII.01 — Vales, anticipos y legalizaciones

> Escalera de madurez de la subcapa **VII.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `vouchers`, `advances`, `settlements` |
| Eventos (outbox → webhooks) | `voucher.issued`, `advance.granted`, `settlement.completed` |
| MCP · lectura | `list_open_advances`, `get_voucher` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `issue_voucher`, `settle_advance` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: vouchers, advances, settlements (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: voucher.issued, advance.granted, settlement.completed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_open_advances, get_voucher (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: issue_voucher, settle_advance (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de anticipos, soportes y rendiciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro de vales y anticipos

#### Funcionalidad

- [ ] Autorización manual
- [ ] Anticipo simple

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Soportes, aprobaciones y legalizaciones

#### Funcionalidad

- [ ] Solicitud y aprobación de gastos
- [ ] Anticipos a empleados con legalización posterior
- [ ] Topes
- [ ] Aviso al solicitante
- [ ] Lista de anticipos pendientes de legalizar

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con caja menor, empleados y contabilidad

#### Funcionalidad

- [ ] Flujo de aprobación por montos
- [ ] Segregación de funciones
- [ ] Delegación
- [ ] Bloqueo de nuevos anticipos
- [ ] Cobro de saldos pendientes por nómina
- [ ] Aprobación en el celular
- [ ] Reglas por centro de costo o por proyecto

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Vencimientos, solicitudes y conciliación automatizados

#### Funcionalidad

- [ ] Motor de políticas de gasto
- [ ] Aprobación condicional con IA
- [ ] Presupuesto comprometido
- [ ] Solicitudes de compra
- [ ] Anticipos con tarjeta o billetera prepago
- [ ] Reembolsos a empleados

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de inconsistencias y anticipos pendientes

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gobierno empresarial de anticipos y rendiciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

