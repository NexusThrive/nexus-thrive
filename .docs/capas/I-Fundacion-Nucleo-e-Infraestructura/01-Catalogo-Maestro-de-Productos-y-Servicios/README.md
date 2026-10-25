---
id: I.01
capa: "I — FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
titulo: "Catálogo maestro de productos y servicios"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# I.01 — Catálogo maestro de productos y servicios

> Escalera de madurez de la subcapa **I.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `products`, `categories`, `price-lists`, `variants` |
| Eventos (outbox → webhooks) | `product.created`, `product.updated`, `product.price_changed`, `product.archived` |
| MCP · lectura | `list_products`, `get_product`, `get_price` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_product`, `update_price` |
| Sistemas externos (puertos y adaptadores) | Importación Excel/CSV, Alegra (migración) |

#### Integración

- [ ] API REST de lectura: products, categories, price-lists, variants (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: product.created, product.updated, product.price_changed, product.archived (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_products, get_product, get_price (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_product, update_price (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de productos, servicios y datos maestros

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Catálogo maestro de productos y servicios»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Catálogo maestro de productos y servicios»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `products`, `categories`, `price-lists`, `variants`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `product.created`, `product.updated`, `product.price_changed`, `product.archived`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Productos, servicios y terceros básicos

#### Funcionalidad

- [x] Productos y servicios — _hecho: Catálogo: productos, servicios, planes, entradas y tours_
- [x] Clientes y proveedores _(PR-08)_
- [x] Importación desde Excel con validación. _hecho: app/[tenant]/(app)/data + lib/data-exchange (vista previa, error por fila, idempotente)_
- [x] Activar y desactivar ítems sin borrarlos. — _hecho: `Product.active`_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Variantes, listas de precios y clasificación fiscal

#### Funcionalidad

- [x] Variantes _(PR-09)_
- [x] Listas de precios _(PR-09)_
- [ ] Servicios y paquetes
- [x] Clasificación fiscal por ítem _(PR-09)_
- [ ] Ficha de tercero completa _(PR-08)_
- [x] Detección de duplicados _(PR-08)_
- [ ] Cuenta contable por defecto

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Aprobaciones, historial y atributos por vertical

#### Funcionalidad

- [ ] Aprobación para crear o modificar
- [ ] Historial de cambios de precio y costo
- [ ] Validación del NIT y consulta del RUT
- [ ] Atributos y campos personalizados
- [ ] Catálogo compartido entre sedes
- [ ] Documentos por tercero

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Catálogo compartido entre sedes y canales

#### Funcionalidad

- [ ] Gestión de datos maestros multiempresa
- [ ] Verificación de proveedores
- [ ] Catálogo sincronizado
- [ ] Enriquecimiento y limpieza de datos con IA
- [ ] Plantillas de catálogo por vertical

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Validación, enriquecimiento y limpieza con IA

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Maestro de datos». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Catálogo maestro de productos y servicios» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de duplicados y de datos incompletos con puntaje de confianza; la fusión la aprueba una persona y es reversible _(propuesta)_
- [ ] Completar y normalizar datos desde fuentes externas, con la fuente y la fecha guardadas _(propuesta)_
- [ ] Medición de calidad del dato (completitud, duplicados, antigüedad) visible por organización _(propuesta)_


## N6 — Datos maestros multiempresa y verificación de riesgo

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Maestro de datos». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación entre varias sedes o empresas de la misma persona, con permisos por organización _(propuesta)_
- [ ] Reglas de retención, anonimización y borrado a pedido (Ley 1581) _(propuesta)_
- [ ] Límites por plan y consumo medido, sin bloquear funciones _(propuesta)_

