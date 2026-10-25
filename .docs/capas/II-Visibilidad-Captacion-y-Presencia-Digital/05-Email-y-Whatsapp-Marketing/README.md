---
id: II.05
capa: "II — VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL"
titulo: "Email y WhatsApp marketing"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# II.05 — Email y WhatsApp marketing

> Escalera de madurez de la subcapa **II.05**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `audiences`, `campaign-messages`, `templates`, `consents` |
| Eventos (outbox → webhooks) | `message.sent`, `message.delivered`, `message.opened`, `consent.changed` |
| MCP · lectura | `list_audiences`, `get_campaign_metrics` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `schedule_campaign`, `send_template_message` |
| Sistemas externos (puertos y adaptadores) | WhatsApp Business (Cloud API), proveedor de correo (SES / Resend) |

#### Integración

- [ ] API REST de lectura: audiences, campaign-messages, templates, consents (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: message.sent, message.delivered, message.opened, consent.changed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_audiences, get_campaign_metrics (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: schedule_campaign, send_template_message (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de listas, envíos y consentimiento

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Email y WhatsApp marketing»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Email y WhatsApp marketing»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `audiences`, `campaign-messages`, `templates`, `consents`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `message.sent`, `message.delivered`, `message.opened`, `consent.changed`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Envío de correo y WhatsApp con plantillas

#### Funcionalidad

- [ ] Listas de contactos, importación y exportación.
- [ ] Envío de correo
- [x] Envío de WhatsApp — _hecho: manual: abre WhatsApp con la plantilla (wa.me); sin API_
- [ ] Baja automática (unsubscribe) y registro de opt-in.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Segmentación, secuencias y personalización

#### Funcionalidad

- [ ] Segmentación
- [ ] Variables de personalización
- [ ] Secuencias automáticas
- [ ] Programación de envíos
- [ ] Métricas básicas: entregados, abiertos, clics, respuestas y bajas.
- [ ] Disparadores desde el CRM

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Flujos visuales, reputación y pruebas A/B

#### Funcionalidad

- [ ] Constructor visual de flujos
- [ ] Listas dinámicas
- [ ] Control de reputación
- [ ] Control de calidad de plantillas de WhatsApp
- [ ] Pruebas A/B
- [ ] Atribución de ingresos
- [ ] Aprobación interna

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Atribución de ingresos y aprobaciones internas

#### Funcionalidad

- [ ] Contenido y asuntos generados por IA
- [ ] Hora óptima de envío por contacto
- [ ] Campañas conversacionales
- [ ] SMS, notificaciones push y correo transaccional
- [ ] Recomendaciones personalizadas
- [ ] Reactivación inteligente
- [ ] Reportes de rentabilidad

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Campañas conversacionales y hora óptima con IA

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Email y WhatsApp marketing» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Recomendación de canal, horario y presupuesto a partir de resultados ya medidos (no de supuestos) _(propuesta)_
- [ ] Borradores de contenido y respuestas con revisión humana antes de publicar _(propuesta)_
- [ ] Atribución asistida: qué acción trajo qué cliente, con la regla de atribución visible _(propuesta)_


## N6 — Motor omnicanal: SMS, push y reactivación inteligente

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Captación y alcance». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación con muchas marcas, sedes o cuentas desde un mismo panel, con permisos por marca _(propuesta)_
- [ ] Cumplimiento: consentimiento, preferencias y bajas respetadas en todos los canales _(propuesta)_
- [ ] Límites por plan y consumo medido (envíos, consultas, almacenamiento) _(propuesta)_

