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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Sitios web, landing pages y CMS»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Sitios web, landing pages y CMS»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `sites`, `pages`, `blocks`, `domains`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `site.published`, `page.updated`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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
- [x] Presencia verificada por pilares y madurez NEXUS _hecho: lib/presence/pillars.ts · lib/presence/maturity.ts · PR #104 · pruebas lib/presence/*.test.ts_

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
- [x] Reporte semanal de presencia emitido como evento (una vez por semana por negocio) _hecho: lib/presence/notices.ts · lib/presence/pillars-db.ts (sendWeeklyReports) · PR #105; hay que programar el cron que llama a /api/cron/webhooks_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Personalización de contenidos y optimización de conversión

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Sitios web, landing pages y CMS» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Recomendación de canal, horario y presupuesto a partir de resultados ya medidos (no de supuestos) _(propuesta)_
- [ ] Borradores de contenido y respuestas con revisión humana antes de publicar _(propuesta)_
- [ ] Atribución asistida: qué acción trajo qué cliente, con la regla de atribución visible _(propuesta)_


## N6 — Plataforma digital empresarial multisitio y multitenant

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación con muchas marcas, sedes o cuentas desde un mismo panel, con permisos por marca _(propuesta)_
- [ ] Cumplimiento: consentimiento, preferencias y bajas respetadas en todos los canales _(propuesta)_
- [ ] Límites por plan y consumo medido (envíos, consultas, almacenamiento) _(propuesta)_

