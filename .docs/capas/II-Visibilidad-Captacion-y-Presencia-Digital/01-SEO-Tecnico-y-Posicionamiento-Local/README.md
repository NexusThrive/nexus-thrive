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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «SEO técnico y posicionamiento local»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «SEO técnico y posicionamiento local»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `seo-audits`, `local-listings`, `keywords`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `seo_audit.completed`, `listing.synced`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Metadatos, sitemap y configuración básica

#### Funcionalidad

- [x] Títulos, descripciones y URLs editables _(PR-25)_ — _hecho: `lib/site/site-db.ts` guarda `title`, `description` y `siteSlug` del sitio (validados) desde `app/[tenant]/(app)/sitio/_components/site-editor.tsx`_
- [x] Sitemap, robots y etiquetas básicas automáticas. _(PR-25)_ — _hecho: `app/sitemap.ts`, `app/robots.ts`, `app/s/[slug]/sitemap.xml/route.ts`, `app/s/[slug]/robots.txt/route.ts`; `generateMetadata` y JSON-LD en `app/s/[slug]/page.tsx`_
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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «SEO técnico y posicionamiento local» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Recomendación de canal, horario y presupuesto a partir de resultados ya medidos (no de supuestos) _(propuesta)_
- [ ] Borradores de contenido y respuestas con revisión humana antes de publicar _(propuesta)_
- [ ] Atribución asistida: qué acción trajo qué cliente, con la regla de atribución visible _(propuesta)_


## N6 — Gestión SEO multisitio y posicionamiento a escala

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación con muchas marcas, sedes o cuentas desde un mismo panel, con permisos por marca _(propuesta)_
- [ ] Cumplimiento: consentimiento, preferencias y bajas respetadas en todos los canales _(propuesta)_
- [ ] Límites por plan y consumo medido (envíos, consultas, almacenamiento) _(propuesta)_

