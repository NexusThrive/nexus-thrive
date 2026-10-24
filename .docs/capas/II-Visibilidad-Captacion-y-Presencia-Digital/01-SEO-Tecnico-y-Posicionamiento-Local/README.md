---
id: II.01
capa: "II — VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL"
titulo: "SEO técnico y posicionamiento local"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# II.01 — SEO técnico y posicionamiento local

> Escalera de madurez de la subcapa **II.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `seo-audits`, `local-listings`, `keywords` |
| Eventos (outbox → webhooks) | `seo_audit.completed`, `listing.synced` |
| MCP · lectura | `get_seo_audit`, `list_listings` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `update_listing` |
| Sistemas externos (puertos y adaptadores) | Google Business Profile, Search Console |

#### Integración

- [ ] API REST de lectura: seo-audits, local-listings, keywords (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: seo_audit.completed, listing.synced (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_seo_audit, list_listings (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: update_listing (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento SEO y estructura de indexación

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Metadatos, sitemap y configuración básica

#### Funcionalidad

- [x] Títulos, descripciones y URLs editables _(PR-25)_
- [x] Sitemap, robots y etiquetas básicas automáticas. _(PR-25)_
- [ ] Ficha de Google Business _(PR-27)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — SEO técnico, contenido y datos estructurados

#### Funcionalidad

- [ ] Datos estructurados (schema)
- [ ] Panel de Google Business
- [ ] Revisión de reseñas
- [ ] Informe SEO básico por página (títulos largos, imágenes sin descripción, enlaces…
- [ ] Integración con Google Search Console.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con analítica y perfiles comerciales locales

#### Funcionalidad

- [ ] Seguimiento de palabras clave
- [ ] Páginas por servicio y por ciudad
- [ ] Auditoría técnica
- [ ] NAP consistente
- [ ] Informe de visibilidad local
- [ ] Redirecciones y control de errores 404.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Monitorización y corrección automatizada de problemas

#### Funcionalidad

- [ ] Asistente SEO con IA
- [ ] Análisis de competidores locales
- [ ] Gestión multi-sede
- [ ] Optimización para buscadores con IA
- [ ] Generación masiva de páginas locales
- [ ] Reportes de retorno

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de oportunidades y optimización basada en datos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión SEO multisitio y posicionamiento a escala

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

