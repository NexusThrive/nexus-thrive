---
id: V.02
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Suscripciones y cobros recurrentes"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# V.02 — Suscripciones y cobros recurrentes

> Escalera de madurez de la subcapa **V.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `subscriptions`, `plans`, `billing-cycles`, `dunning` |
| Eventos (outbox → webhooks) | `subscription.created`, `subscription.renewed`, `subscription.payment_failed`, `subscription.canceled` |
| MCP · lectura | `list_subscriptions`, `get_subscription` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_subscription`, `cancel_subscription` |
| Sistemas externos (puertos y adaptadores) | Pasarelas con cobro recurrente (Nequi, Wompi, Stripe) |

#### Integración

- [ ] API REST de lectura: subscriptions, plans, billing-cycles, dunning (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: subscription.created, subscription.renewed, subscription.payment_failed, subscription.canceled (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_subscriptions, get_subscription (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_subscription, cancel_subscription (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de ciclos, planes y renovaciones

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Suscripciones y cobros recurrentes»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Suscripciones y cobros recurrentes»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `subscriptions`, `plans`, `billing-cycles`, `dunning`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `subscription.created`, `subscription.renewed`, `subscription.payment_failed`, `subscription.canceled`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Suscripciones y cobros recurrentes básicos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Plan recurrente con periodicidad, precio y fecha del próximo cobro _(propuesta)_
- [ ] Estados: activa, pausada y cancelada, con motivo _(propuesta)_
- [ ] Cobro periódico generado por el servicio de dinero y reintento ante fallo _(propuesta)_
- [ ] Historial de cobros por suscripción _(propuesta)_
- [ ] Reutilizar la lógica de membresías (renovar, congelar, cancelar) sin duplicarla _(propuesta)_


## N2 — Prorrateos, cambios de plan y estados de suscripción

#### Funcionalidad

- [x] Planes de suscripción
- [ ] Recordatorios antes del cobro
- [ ] Cobro recurrente con Nequi o la pasarela elegida, con autorización del cliente _(objetivo 2026 · ver `docs/PENDIENTES.md`)_

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con pagos, facturación y tenants

#### Funcionalidad

- [ ] Reintentos inteligentes
- [ ] Cambios de plan, pausas, cancelación
- [ ] Periodo de prueba
- [ ] Cuotas y financiación
- [ ] Reportes de recurrencia

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Renovaciones, reintentos y notificaciones automáticas

#### Funcionalidad

- [ ] Cobros por uso o por consumo
- [ ] Dunning con IA
- [ ] Débito automático bancario
- [ ] Facturación de la propia plataforma
- [ ] Descuentos, créditos y cupones recurrentes.
- [ ] Predicción de cancelación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Predicción de cancelación y recuperación de pagos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Suscripciones y cobros recurrentes» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de anomalías (montos atípicos, duplicados, desvíos frente al historial) con explicación de por qué se marcó _(propuesta)_
- [ ] Sugerencia de cuenta, impuesto o clasificación con nivel de confianza; nada se contabiliza sin regla o aprobación _(propuesta)_
- [ ] Previsión a corto plazo con el historial real y el margen de error mostrado _(propuesta)_


## N6 — Motor de suscripciones y facturación recurrente a escala

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación multimoneda y multiempresa con eliminaciones y conciliación entre entidades _(propuesta)_
- [ ] Auditoría completa e inalterable de cada cambio, consultable y exportable _(propuesta)_
- [ ] Volumen: pruebas con cargas grandes (miles de documentos por mes) y cierres sin bloquear la operación _(propuesta)_

