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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Publicidad digital y atribución multicanal»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Publicidad digital y atribución multicanal»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `campaigns`, `ad-accounts`, `attributions`, `conversions`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `campaign.created`, `conversion.recorded`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Publicidad digital y atribución multicanal» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Recomendación de canal, horario y presupuesto a partir de resultados ya medidos (no de supuestos) _(propuesta)_
- [ ] Borradores de contenido y respuestas con revisión humana antes de publicar _(propuesta)_
- [ ] Atribución asistida: qué acción trajo qué cliente, con la regla de atribución visible _(propuesta)_


## N6 — Gestión publicitaria multicanal a escala empresarial

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación con muchas marcas, sedes o cuentas desde un mismo panel, con permisos por marca _(propuesta)_
- [ ] Cumplimiento: consentimiento, preferencias y bajas respetadas en todos los canales _(propuesta)_
- [ ] Límites por plan y consumo medido (envíos, consultas, almacenamiento) _(propuesta)_

