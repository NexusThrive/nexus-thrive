---
id: V.07
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Marketplace y distribución multicanal"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# V.07 — Marketplace y distribución multicanal

> Escalera de madurez de la subcapa **V.07**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `channels`, `listings`, `channel-orders`, `stock-sync` |
| Eventos (outbox → webhooks) | `listing.published`, `channel_order.received`, `stock.synced` |
| MCP · lectura | `list_listings`, `get_channel_orders` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `publish_listing`, `sync_stock` |
| Sistemas externos (puertos y adaptadores) | MercadoLibre, Rappi, Amazon, redes de distribución |

#### Integración

- [ ] API REST de lectura: channels, listings, channel-orders, stock-sync (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: listing.published, channel_order.received, stock.synced (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_listings, get_channel_orders (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: publish_listing, sync_stock (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de canales, tarifas y disponibilidad

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Calendarios iCal y registro manual de canales

#### Funcionalidad

- [ ] Calendarios iCal
- [ ] Registro manual
- [ ] Pedidos de Rappi

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Sincronización y mapeo de productos por canal

#### Funcionalidad

- [ ] Sincronización de disponibilidad
- [ ] Importación automática de reservas
- [ ] Mapeo de productos
- [ ] Comisión por canal
- [ ] Mensajes del canal

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Channel manager: tarifas, restricciones y sobreventa

#### Funcionalidad

- [ ] Channel manager completo
- [ ] Prevención de sobreventa
- [ ] Reglas de precio por canal
- [ ] Conciliación de pagos de canales
- [ ] Alertas
- [ ] Reportes por canal

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Conciliación de pagos y reportes por canal

#### Funcionalidad

- [ ] Más canales
- [ ] Tarifas dinámicas
- [ ] Marketplace propio
- [ ] Distribución B2B
- [ ] Liquidaciones a terceros
- [ ] Plataforma abierta

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Tarifas dinámicas y distribución B2B

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Marketplace propio y plataforma abierta multicanal

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

