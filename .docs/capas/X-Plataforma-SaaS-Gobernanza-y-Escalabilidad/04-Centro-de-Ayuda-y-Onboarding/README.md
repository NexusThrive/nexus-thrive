---
id: X.04
capa: "X — PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD"
titulo: "Centro de ayuda y onboarding"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# X.04 — Centro de ayuda y onboarding

> Escalera de madurez de la subcapa **X.04**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `help-articles`, `onboarding-progress`, `checklists` |
| Eventos (outbox → webhooks) | `onboarding.step_completed`, `help.article_viewed` |
| MCP · lectura | `search_help`, `get_onboarding_progress` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `complete_onboarding_step` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: help-articles, onboarding-progress, checklists (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: onboarding.step_completed, help.article_viewed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: search_help, get_onboarding_progress (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: complete_onboarding_step (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de incorporación, soporte y documentación

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Centro de ayuda y onboarding»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Centro de ayuda y onboarding»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `help-articles`, `onboarding-progress`, `checklists`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `onboarding.step_completed`, `help.article_viewed`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Guías básicas y recorrido inicial

#### Funcionalidad

- [x] Centro de ayuda — _hecho: landing `/help`_
- [x] Botón de soporte — _hecho: WhatsApp de NEXUS_
- [ ] Videos cortos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Tutoriales, artículos, preguntas frecuentes y progreso

#### Funcionalidad

- [x] Onboarding guiado paso a paso — _hecho: wizard adaptativo `/onboarding`_
- [x] Plantilla de arranque por vertical — _hecho: presets por rubro_
- [ ] Ayuda contextual dentro de la app
- [ ] Buscador del centro de ayuda
- [ ] Importación asistida
- [ ] Estados vacíos útiles

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con usuarios, planes y módulos habilitados

#### Funcionalidad

- [ ] Recorridos interactivos
- [ ] Soporte integrado
- [ ] Métricas de activación
- [ ] Mensajes de adopción
- [ ] Academia / capacitación para clientes
- [ ] Novedades del producto
- [ ] Comunidad y retroalimentación
- [ ] Servicio de implementación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Incorporación, asistencia y seguimiento automatizados

#### Funcionalidad

- [ ] Asistente de IA de soporte
- [ ] Onboarding personalizado con IA
- [ ] Guías adaptativas
- [ ] Éxito del cliente (customer success)
- [ ] Red de partners certificados
- [ ] Documentación multi-idioma
- [ ] Base de conocimiento viva

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Ayuda contextual y recorridos personalizados

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Centro de ayuda y onboarding» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Plataforma empresarial de adopción, aprendizaje y soporte

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

