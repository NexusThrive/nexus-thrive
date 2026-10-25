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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Marketplace y distribución multicanal»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Marketplace y distribución multicanal»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `channels`, `listings`, `channel-orders`, `stock-sync`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `listing.published`, `channel_order.received`, `stock.synced`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Marketplace y distribución multicanal» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Recomendación de canal, horario y presupuesto a partir de resultados ya medidos (no de supuestos) _(propuesta)_
- [ ] Borradores de contenido y respuestas con revisión humana antes de publicar _(propuesta)_
- [ ] Atribución asistida: qué acción trajo qué cliente, con la regla de atribución visible _(propuesta)_


## N6 — Marketplace propio y plataforma abierta multicanal

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación con muchas marcas, sedes o cuentas desde un mismo panel, con permisos por marca _(propuesta)_
- [ ] Cumplimiento: consentimiento, preferencias y bajas respetadas en todos los canales _(propuesta)_
- [ ] Límites por plan y consumo medido (envíos, consultas, almacenamiento) _(propuesta)_

