---
id: II.06
capa: "II — VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL"
titulo: "Redes sociales y contenido"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# II.06 — Redes sociales y contenido

> Escalera de madurez de la subcapa **II.06**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `social-accounts`, `posts`, `content-calendar` |
| Eventos (outbox → webhooks) | `post.scheduled`, `post.published` |
| MCP · lectura | `list_scheduled_posts`, `get_post_metrics` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `draft_post`, `schedule_post` |
| Sistemas externos (puertos y adaptadores) | Instagram / Facebook Graph API, Google Business posts |

#### Integración

- [ ] API REST de lectura: social-accounts, posts, content-calendar (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: post.scheduled, post.published (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_scheduled_posts, get_post_metrics (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: draft_post, schedule_post (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de perfiles, calendario y biblioteca

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Calendario editorial y enlaces a perfiles

#### Funcionalidad

- [ ] Calendario editorial
- [ ] Biblioteca de imágenes y textos guardados.
- [ ] Enlace a perfiles y botón de compartir en el sitio.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Programación multi-red y plantillas de diseño

#### Funcionalidad

- [ ] Conexión de Instagram, Facebook, TikTok y LinkedIn
- [ ] Publicación múltiple
- [ ] Plantillas de diseño (editor tipo Canva embebido o integración).
- [ ] Métricas básicas
- [ ] Hashtags y textos guardados.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Flujos de aprobación y escucha de comentarios

#### Funcionalidad

- [ ] Flujo de aprobación
- [ ] Calendario por equipo y por marca
- [ ] Métricas comparadas
- [ ] Escucha de comentarios y menciones
- [ ] Banco de ideas y fechas clave
- [ ] Reportes mensuales

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Métricas comparadas y reportes automáticos

#### Funcionalidad

- [ ] IA para ideas, guiones, textos y variaciones
- [ ] Generación de imágenes y videos cortos
- [ ] Análisis de competencia
- [ ] Contenido generado por clientes (UGC)
- [ ] Social commerce
- [ ] Atribución

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — IA generativa y análisis de competencia

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Social commerce, UGC e influencers con atribución

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

