---
id: IV.02
capa: "IV — GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES"
titulo: "Cotizaciones y propuestas comerciales"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# IV.02 — Cotizaciones y propuestas comerciales

> Escalera de madurez de la subcapa **IV.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `quotes`, `quote-lines`, `quote-templates` |
| Eventos (outbox → webhooks) | `quote.created`, `quote.sent`, `quote.accepted`, `quote.expired` |
| MCP · lectura | `list_quotes`, `get_quote` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `draft_quote`, `send_quote` |
| Sistemas externos (puertos y adaptadores) | Firma electrónica (VI.03) |

#### Integración

- [ ] API REST de lectura: quotes, quote-lines, quote-templates (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: quote.created, quote.sent, quote.accepted, quote.expired (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_quotes, get_quote (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: draft_quote, send_quote (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de ofertas, precios y condiciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Creación de cotizaciones básicas

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N2 — Versiones, descuentos, impuestos y aprobación

#### Funcionalidad

- [ ] Cotizaciones generadas desde la oportunidad

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con CRM, catálogo y pagos

#### Funcionalidad

- [ ] Versiones de cotización
- [ ] Aceptación en línea

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Generación, envío y seguimiento automatizados

#### Funcionalidad

- [ ] Cotizaciones configurables (CPQ)
- [ ] Propuestas interactivas
- [ ] Integración con presupuestos de obra

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Recomendación de ofertas y análisis de aceptación

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de propuestas y negociación

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

