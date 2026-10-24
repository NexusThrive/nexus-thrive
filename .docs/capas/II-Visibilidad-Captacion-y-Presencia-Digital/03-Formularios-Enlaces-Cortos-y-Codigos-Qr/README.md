---
id: II.03
capa: "II — VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL"
titulo: "Formularios, enlaces cortos y códigos QR"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# II.03 — Formularios, enlaces cortos y códigos QR

> Escalera de madurez de la subcapa **II.03**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `forms`, `form-submissions`, `short-links`, `qr-codes` |
| Eventos (outbox → webhooks) | `form.submitted`, `short_link.clicked` |
| MCP · lectura | `list_forms`, `get_form_responses`, `get_link_stats` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_form`, `create_short_link` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: forms, form-submissions, short-links, qr-codes (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: form.submitted, short_link.clicked (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_forms, get_form_responses, get_link_stats (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_form, create_short_link (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de captura y direccionamiento

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Formularios y enlaces básicos

#### Funcionalidad

- [x] QR — _hecho: recibos con QR, carné de socio, códigos de acceso_
- [ ] Enlaces cortos _(PR-28)_
- [ ] Formulario simple _(PR-28)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión de formularios, QR y destinos personalizados

#### Funcionalidad

- [ ] QR con marca
- [ ] Enlaces cortos con dominio propio
- [ ] Constructor de formularios
- [ ] Estadísticas por QR y enlace
- [ ] Página tipo “link in bio”

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con CRM, campañas y canales de atención

#### Funcionalidad

- [ ] Formularios multipaso
- [ ] Carga de archivos, firma y pago
- [ ] Enrutamiento
- [ ] Protección antispam
- [ ] QR por ubicación o mesa
- [ ] Plantillas por vertical

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Distribución, seguimiento y procesamiento automatizado

#### Funcionalidad

- [ ] Formularios generados por IA
- [ ] Enlaces inteligentes
- [ ] QR con experiencias
- [ ] Integración con firma electrónica y documentos
- [ ] Testeo A/B de formularios
- [ ] API y webhooks

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de conversión por origen y comportamiento

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Sistema de captación omnicanal escalable

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

