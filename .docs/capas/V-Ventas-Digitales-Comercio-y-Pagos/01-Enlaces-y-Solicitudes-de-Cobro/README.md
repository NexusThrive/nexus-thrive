---
id: V.01
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Enlaces y solicitudes de cobro"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# V.01 — Enlaces y solicitudes de cobro

> Escalera de madurez de la subcapa **V.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `payment-links`, `payment-requests` |
| Eventos (outbox → webhooks) | `payment_link.created`, `payment_link.paid`, `payment_link.expired` |
| MCP · lectura | `list_payment_links`, `get_payment_link` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_payment_link`, `send_payment_request` |
| Sistemas externos (puertos y adaptadores) | Pasarelas de V.00, WhatsApp / correo para enviar |

#### Integración

- [ ] API REST de lectura: payment-links, payment-requests (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: payment_link.created, payment_link.paid, payment_link.expired (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_payment_links, get_payment_link (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_payment_link, send_payment_request (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de solicitudes y conceptos de cobro

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Creación de enlaces de pago

#### Funcionalidad

- [ ] Link de pago _(PR-17)_
- [ ] Botón de pago _(PR-17)_
- [ ] Estado del link (pendiente, pagado, vencido). _(PR-17)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Importes, vencimientos y estados de cobro

#### Funcionalidad

- [ ] Links desde cualquier documento
- [ ] Link con vencimiento y pago parcial.
- [ ] QR de cobro

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con clientes, facturas y pagos

#### Funcionalidad

- [ ] Cobranza

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Envíos, recordatorios y actualización automatizados

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N5 — Priorización de cobros y análisis de conversión

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de cobros multicanal

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

