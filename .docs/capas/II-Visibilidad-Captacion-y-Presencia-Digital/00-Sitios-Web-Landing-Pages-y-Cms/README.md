---
id: II.00
capa: "II — VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL"
titulo: "Sitios web, landing pages y CMS"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# II.00 — Sitios web, landing pages y CMS

> Escalera de madurez de la subcapa **II.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `sites`, `pages`, `blocks`, `domains` |
| Eventos (outbox → webhooks) | `site.published`, `page.updated` |
| MCP · lectura | `list_pages`, `get_site_status` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `draft_page`, `publish_site` |
| Sistemas externos (puertos y adaptadores) | DNS / dominios, CDN |

#### Integración

- [ ] API REST de lectura: sites, pages, blocks, domains (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: site.published, page.updated (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_pages, get_site_status (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: draft_page, publish_site (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de presencia digital y contenidos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Sitio web o landing page básica

#### Funcionalidad

- [ ] Plantillas por vertical, con edición de textos, imágenes y colores. _(PR-25)_
- [ ] Subdominio automático (`negocio.nexusthrive.co`). _(PR-25)_
- [x] Botón flotante de WhatsApp, mapa y datos de contacto. _(PR-25)_
- [x] Diseño responsive (celular primero). _(PR-25)_
- [ ] Editor de entradas con título, imagen, texto y categoría.
- [ ] Publicar, programar y guardar borrador.
- [ ] Página de blog automática en el sitio del negocio.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — CMS, páginas y gestión completa de contenidos

#### Funcionalidad

- [ ] Constructor por bloques
- [ ] Dominio propio
- [ ] Formularios que crean leads en el CRM
- [ ] Páginas múltiples
- [ ] Widget de reservas, cotización o catálogo
- [ ] Píxel de Meta, Google Analytics y Tag Manager configurables.
- [ ] Categorías, etiquetas, autores y buscador.
- [ ] Editor por bloques
- [ ] SEO por entrada
- [ ] Biblioteca de contenido reutilizable
- [ ] Llamados a la acción
- [x] Barra de Presencia en dos fases: visibilidad **verificada** (venta en línea, reputación, atribución) y, cuando está llena, madurez NEXUS _(objetivo 2026)_ _(PR-24)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con CRM, formularios y analítica

#### Funcionalidad

- [ ] Versionado y borrador/publicado
- [ ] Pruebas A/B
- [ ] Multi-idioma
- [ ] Biblioteca de secciones reutilizables
- [ ] Roles
- [ ] Métricas por página: visitas, conversión y origen.
- [ ] Velocidad: optimización de imágenes, caché y puntaje Core Web Vitals.
- [ ] Flujo editorial
- [ ] Calendario de contenidos
- [ ] Contenido modular reutilizable
- [ ] Versionado
- [ ] Contenido por vertical
- [ ] Métricas por entrada

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Publicación, despliegue y actualización automatizados

#### Funcionalidad

- [ ] Generación de sitio completo con IA
- [ ] Personalización dinámica
- [ ] Pagos y e-commerce
- [ ] Portal del cliente
- [ ] White-label
- [ ] Mapas de calor y grabaciones de sesión.
- [ ] Marketplace de plantillas y bloques
- [ ] Redacción asistida por IA
- [ ] Reutilización automática
- [ ] Traducción automática
- [ ] CMS “headless”
- [ ] Biblioteca de plantillas de contenido
- [ ] Recomendaciones de temas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Personalización de contenidos y optimización de conversión

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Plataforma digital empresarial multisitio y multitenant

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

