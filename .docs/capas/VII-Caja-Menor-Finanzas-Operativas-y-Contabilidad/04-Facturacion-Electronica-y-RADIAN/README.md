---
id: VII.04
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Facturación electrónica y RADIAN"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# VII.04 — Facturación electrónica y RADIAN

> Escalera de madurez de la subcapa **VII.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `electronic-invoices`, `electronic-credit-notes`, `pos-electronic-documents`, `radian-events`, `provider-accounts` |
| Eventos (outbox → webhooks) | `einvoice.submitted`, `einvoice.accepted`, `einvoice.rejected`, `radian.event_received` |
| MCP · lectura | `get_einvoice_status`, `list_rejected_einvoices` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `submit_einvoice`, `retry_einvoice` |
| Sistemas externos (puertos y adaptadores) | DIAN por proveedor tecnológico (Alegra, Siigo, Factus, Carvajal, etc.) detrás de un puerto de facturación; certificado y resolución por negocio; webhook de estado entrante |

#### Integración

- [ ] API REST de lectura: electronic-invoices, electronic-credit-notes, pos-electronic-documents, radian-events, provider-accounts (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: einvoice.submitted, einvoice.accepted, einvoice.rejected, radian.event_received (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_einvoice_status, list_rejected_einvoices (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: submit_einvoice, retry_einvoice (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento normativo y ciclo de documentos electrónicos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Generación de documentos electrónicos básicos

#### Funcionalidad

- [ ] Factura electrónica _(PR-18)_
- [x] Datos del emisor y del adquirente _(PR-18)_
- [ ] PDF y XML _(PR-18)_
- [x] Documento soporte _(PR-18)_
- [x] Factura electrónica por proveedor tecnológico detrás de un puerto (`EInvoicePort`); no firmar XML propio _(objetivo 2026 · ver `docs/PENDIENTES.md`)_ _hecho: lib/einvoice (puerto + proveedor de prueba)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Validación, estados, notas crédito y notas débito

#### Funcionalidad

- [x] Factura automática _(PR-18)_
- [ ] Notas crédito y débito electrónicas _(PR-20)_
- [ ] Estado ante la DIAN _(PR-18)_
- [ ] Impuestos por ítem y por tercero _(PR-13)_
- [x] Gestión de resoluciones y consecutivos _(PR-13)_
- [ ] Factura de venta en POS

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con proveedor tecnológico, DIAN y módulos financieros

#### Funcionalidad

- [ ] Cola de emisión con reintentos
- [ ] Eventos RADIAN
- [ ] Declaraciones asistidas
- [ ] Información exógena
- [ ] Certificados de retención
- [ ] Calendario tributario
- [ ] Soporte del régimen del negocio

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Envíos, seguimiento y gestión automatizada de respuestas

#### Funcionalidad

- [ ] Multi-NIT y multiempresa
- [ ] Validación automática de facturas recibidas
- [ ] Facturación internacional
- [ ] Motor de reglas fiscales con vigencia
- [ ] Conciliación de impuestos
- [ ] Preparación de auditorías

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de rechazos, inconsistencias y riesgos de cumplimiento

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de facturación electrónica y eventos RADIAN aplicables

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

