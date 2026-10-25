---
id: IV.02
capa: "IV — GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES"
titulo: "Cotizaciones y propuestas comerciales"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# IV.02 — Cotizaciones y propuestas comerciales

> Escalera de madurez de la subcapa **IV.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `quotes`, `quote-lines`, `quote-templates` |
| Eventos (outbox → webhooks) | `quote.created`, `quote.sent`, `quote.accepted`, `quote.expired` |
| MCP · lectura | `list_quotes`, `get_quote` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `draft_quote`, `send_quote` |
| Sistemas externos (puertos y adaptadores) | Firma electrónica (VI.03) |

#### Integración

- [ ] API REST de lectura: quotes, quote-lines, quote-templates (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: quote.created, quote.sent, quote.accepted, quote.expired (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_quotes, get_quote (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: draft_quote, send_quote (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de ofertas, precios y condiciones

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Cotizaciones y propuestas comerciales»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Cotizaciones y propuestas comerciales»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `quotes`, `quote-lines`, `quote-templates`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `quote.created`, `quote.sent`, `quote.accepted`, `quote.expired`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Creación de cotizaciones básicas

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Crear una cotización con cliente e ítems del catálogo _(propuesta)_
- [ ] Totales e impuestos calculados por el servicio de dinero, no en la pantalla _(propuesta)_
- [ ] Estados: borrador, enviada, aceptada, rechazada y vencida, con vigencia _(propuesta)_
- [ ] Versión imprimible (PDF) y envío al cliente _(propuesta)_
- [ ] Convertir una cotización aceptada en pedido o venta sin volver a escribirla _(propuesta)_


## N2 — Versiones, descuentos, impuestos y aprobación

#### Funcionalidad

- [ ] Cotizaciones generadas desde la oportunidad

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con CRM, catálogo y pagos

#### Funcionalidad

- [ ] Versiones de cotización
- [ ] Aceptación en línea

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Generación, envío y seguimiento automatizados

#### Funcionalidad

- [ ] Cotizaciones configurables (CPQ)
- [ ] Propuestas interactivas
- [ ] Integración con presupuestos de obra

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Recomendación de ofertas y análisis de aceptación

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Cotizaciones y propuestas comerciales» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Estimación de duración, costo o carga a partir del historial propio _(propuesta)_
- [ ] Alerta de riesgo de retraso o de desvío antes de que ocurra, con la causa probable _(propuesta)_
- [ ] Asignación y priorización sugeridas, que una persona confirma _(propuesta)_


## N6 — Gestión empresarial de propuestas y negociación

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Flujo operativo». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación multisede y multiequipo con responsables, calendarios y permisos propios _(propuesta)_
- [ ] Plantillas y procedimientos reutilizables entre organizaciones, versionados _(propuesta)_
- [ ] Historial y auditoría de cada cambio, y volumen probado en listas largas _(propuesta)_

