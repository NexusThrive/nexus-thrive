---
id: V.03
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Punto de venta físico y móvil (POS)"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# V.03 — Punto de venta físico y móvil (POS)

> Escalera de madurez de la subcapa **V.03**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `pos-terminals`, `pos-shifts`, `pos-sales`, `cash-movements` |
| Eventos (outbox → webhooks) | `pos_shift.opened`, `pos_shift.closed`, `pos_sale.completed` |
| MCP · lectura | `list_pos_sales`, `get_shift_summary` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `open_shift`, `close_shift` |
| Sistemas externos (puertos y adaptadores) | Impresora térmica, lector de códigos, datáfono |

#### Integración

- [ ] API REST de lectura: pos-terminals, pos-shifts, pos-sales, cash-movements (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: pos_shift.opened, pos_shift.closed, pos_sale.completed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_pos_sales, get_shift_summary (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: open_shift, close_shift (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de caja, terminales y operaciones de venta

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro básico de ventas y medios de pago

#### Funcionalidad

- [x] Venta rápida — _hecho: venta directa desde el Catálogo_
- [x] Recibo — _hecho: recibo consecutivo y enlace público firmado con QR_
- [x] Cierre de caja diario — _hecho: turno de caja con arqueo_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Productos, descuentos, devoluciones y cierres de caja

#### Funcionalidad

- [ ] Catálogo con búsqueda, categorías y código de barras. _(PR-09)_
- [x] Descuentos, propinas y pago mixto _(PR-15)_
- [x] Turnos por cajero _(PR-15)_
- [x] Descuento automático de inventario — _hecho: `sellProduct` en `money-service`_
- [x] Funciona en celular y tablet. _(PR-15)_
- [x] Impresoras térmicas _(PR-16)_
- [x] Clientes asociados a la venta — _hecho: cliente opcional en la venta_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con inventario, clientes y finanzas

#### Funcionalidad

- [ ] Modo sin conexión (offline)
- [ ] Datáfonos integrados
- [ ] Roles
- [ ] Facturación electrónica POS
- [ ] Multi-caja y multi-sede.
- [ ] Cuentas abiertas, mesas y comandas
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Operaciones de caja y sincronización automatizadas

#### Funcionalidad

- [ ] Hardware integrado
- [ ] Pedidos de domicilio y apps de terceros
- [ ] Menú y precios sincronizados
- [ ] Análisis de ventas con IA
- [ ] Control antifraude
- [ ] Conexión con balanzas, básculas y lectores de membresía
- [ ] Franquicias

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de ventas y optimización operativa

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Red empresarial de puntos de venta y sucursales

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

