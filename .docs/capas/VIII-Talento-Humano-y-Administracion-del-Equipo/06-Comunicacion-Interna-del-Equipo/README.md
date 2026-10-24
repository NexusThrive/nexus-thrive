---
id: VIII.06
capa: "VIII — TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO"
titulo: "Comunicación interna del equipo"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VIII.06 — Comunicación interna del equipo

> Escalera de madurez de la subcapa **VIII.06**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `announcements`, `channels`, `acknowledgements` |
| Eventos (outbox → webhooks) | `announcement.published`, `announcement.acknowledged` |
| MCP · lectura | `list_announcements` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `publish_announcement` |
| Sistemas externos (puertos y adaptadores) | WhatsApp / correo / push |

#### Integración

- [ ] API REST de lectura: announcements, channels, acknowledgements (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: announcement.published, announcement.acknowledged (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_announcements (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: publish_announcement (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de comunicación, canales y audiencias

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Anuncios, tablero de novedades y directorio

#### Funcionalidad

- [ ] Anuncios generales
- [ ] Tablero de novedades
- [ ] Directorio del equipo

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Chat de equipo, canales y mensajes directos

#### Funcionalidad

- [ ] Chat de equipo
- [ ] Anuncios segmentados
- [ ] Adjuntos, fotos y notas de voz.
- [ ] Comentarios y menciones (@)
- [ ] Notificaciones por WhatsApp
- [ ] Encuestas rápidas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Permisos, confirmación de lectura y alertas urgentes

#### Funcionalidad

- [ ] Confirmación de lectura obligatoria
- [ ] Canales con permisos
- [ ] Mensaje de turno
- [ ] Historial y búsqueda
- [ ] Comunicación con personal sin correo
- [ ] Alertas urgentes
- [ ] Cumpleaños, aniversarios y reconocimientos públicos.
- [ ] Buzón de sugerencias y línea de denuncias

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Mensaje de turno, historial y búsqueda

#### Funcionalidad

- [ ] Chat integrado a los datos operativos
- [ ] Traducción automática
- [ ] Resúmenes con IA
- [ ] Asistente interno
- [ ] Intranet completa
- [ ] Analítica de clima laboral
- [ ] Comunicación hacia exteriores
- [ ] Integración con Slack, Teams y Google Chat

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Resúmenes con IA y asistente interno

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Intranet empresarial y analítica de clima laboral

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

