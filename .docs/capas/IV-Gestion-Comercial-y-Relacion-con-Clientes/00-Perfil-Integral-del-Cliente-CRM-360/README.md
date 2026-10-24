---
id: IV.00
capa: "IV — GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES"
titulo: "Perfil integral del cliente (CRM 360)"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# IV.00 — Perfil integral del cliente (CRM 360)

> Escalera de madurez de la subcapa **IV.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `customers`, `customer-notes`, `customer-tags`, `customer-timeline` |
| Eventos (outbox → webhooks) | `customer.created`, `customer.updated`, `customer.archived`, `customer.note_added` |
| MCP · lectura | `search_customers`, `get_customer_360`, `get_customer_timeline` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_customer`, `update_customer`, `add_customer_note` |
| Sistemas externos (puertos y adaptadores) | Importación Excel/CSV, Alegra |

#### Integración

- [ ] API REST de lectura: customers, customer-notes, customer-tags, customer-timeline (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: customer.created, customer.updated, customer.archived, customer.note_added (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: search_customers, get_customer_360, get_customer_timeline (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_customer, update_customer, add_customer_note (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento del modelo de cliente y relaciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro y consulta de clientes

#### Funcionalidad

- [x] Base de contactos
- [ ] Empresas / clientes _(PR-08)_
- [x] Notas e historial
- [x] Etiquetas y estados — _hecho: etiquetas, activo/archivado_
- [x] Búsqueda y filtros.
- [x] Importar y exportar _hecho: clientes en /data (plantilla, exportar CSV, importar con revisión)_

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Historial, segmentos y perfil comercial completo

#### Funcionalidad

- [ ] Detección de duplicados
- [ ] Campos personalizados
- [ ] Importador con vista previa
- [ ] Normalización automática
- [ ] Varios contactos por empresa
- [ ] Vistas guardadas
- [ ] Adjuntos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con ventas, atención, pagos y marketing

#### Funcionalidad

- [ ] Historial unificado
- [ ] Relaciones entre contactos
- [ ] Propietario del contacto
- [ ] Calidad de datos
- [ ] Control de exportaciones
- [ ] Fusión masiva y reglas de deduplicación
- [ ] Enriquecimiento manual asistido

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Actualización, segmentación y seguimiento automatizados

#### Funcionalidad

- [ ] Customer 360 completo
- [ ] Enriquecimiento automático
- [ ] Jerarquías de cuentas
- [ ] Resolución de identidad entre canales
- [ ] Memoria del cliente para la IA
- [ ] Gestión de datos maestros

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Enriquecimiento y análisis inteligente de clientes

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Vista unificada empresarial de relaciones y clientes

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

