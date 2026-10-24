---
id: II.02
capa: "II — VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL"
titulo: "Publicidad digital y atribución multicanal"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# II.02 — Publicidad digital y atribución multicanal

> Escalera de madurez de la subcapa **II.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `campaigns`, `ad-accounts`, `attributions`, `conversions` |
| Eventos (outbox → webhooks) | `campaign.created`, `conversion.recorded` |
| MCP · lectura | `list_campaigns`, `get_campaign_results` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `propose_campaign_budget` |
| Sistemas externos (puertos y adaptadores) | Meta Ads, Google Ads, TikTok Ads (API de conversiones) |

#### Integración

- [ ] API REST de lectura: campaigns, ad-accounts, attributions, conversions (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: campaign.created, conversion.recorded (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_campaigns, get_campaign_results (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: propose_campaign_budget (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de campañas, objetivos y atribución

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro y seguimiento básico de campañas

#### Funcionalidad

- [ ] Registro manual de campañas
- [x] UTM automáticos _(PR-28)_
- [x] Reporte simple: inversión vs. leads recibidos por origen. _(PR-28)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión de campañas, conversiones y presupuestos

#### Funcionalidad

- [ ] Conexión con Meta Ads y Google Ads
- [ ] Costo por lead y por cliente
- [ ] Eventos de conversión enviados de vuelta
- [ ] Campañas “Click to WhatsApp”
- [ ] Audiencias desde el CRM

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con plataformas publicitarias y CRM

#### Funcionalidad

- [ ] Crear y pausar campañas desde la plataforma
- [ ] Presupuestos y alertas
- [ ] Atribución multicanal
- [ ] ROAS real
- [ ] Informes por cliente final
- [ ] Biblioteca de creativos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Automatización de reportes, reglas y alertas

#### Funcionalidad

- [ ] Optimización con IA
- [ ] Generación de anuncios
- [ ] Reglas automáticas
- [ ] Modelos de atribución avanzados
- [ ] Otros canales
- [ ] Valor de vida del cliente (LTV) por canal

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Optimización de campañas y atribución avanzada

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión publicitaria multicanal a escala empresarial

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

