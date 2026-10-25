---
id: V.01
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Enlaces y solicitudes de cobro"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# V.01 — Enlaces y solicitudes de cobro

> Escalera de madurez de la subcapa **V.01**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `payment-links`, `payment-requests` |
| Eventos (outbox → webhooks) | `payment_link.created`, `payment_link.paid`, `payment_link.expired` |
| MCP · lectura | `list_payment_links`, `get_payment_link` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_payment_link`, `send_payment_request` |
| Sistemas externos (puertos y adaptadores) | Pasarelas de V.00, WhatsApp / correo para enviar |

#### Integración

- [ ] API REST de lectura: payment-links, payment-requests (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: payment_link.created, payment_link.paid, payment_link.expired (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_payment_links, get_payment_link (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_payment_link, send_payment_request (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de solicitudes y conceptos de cobro

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Enlaces y solicitudes de cobro»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Enlaces y solicitudes de cobro»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `payment-links`, `payment-requests`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `payment_link.created`, `payment_link.paid`, `payment_link.expired`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Creación de enlaces de pago

#### Funcionalidad

- [x] Link de pago _(PR-17)_
- [x] Botón de pago _(PR-17)_
- [x] Estado del link (pendiente, pagado, vencido). _(PR-17)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Importes, vencimientos y estados de cobro

#### Funcionalidad

- [ ] Links desde cualquier documento
- [ ] Link con vencimiento y pago parcial.
- [ ] QR de cobro

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con clientes, facturas y pagos

#### Funcionalidad

- [ ] Cobranza

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Envíos, recordatorios y actualización automatizados

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Confirmaciones y recordatorios de pedido y envío por los canales de avisos (VI.08) _(propuesta)_
- [ ] Actualización del estado del envío desde el transportista (webhook) _(propuesta)_
- [ ] Reintentos y registro de entregas fallidas _(propuesta)_


## N5 — Priorización de cobros y análisis de conversión

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Enlaces y solicitudes de cobro» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de anomalías (montos atípicos, duplicados, desvíos frente al historial) con explicación de por qué se marcó _(propuesta)_
- [ ] Sugerencia de cuenta, impuesto o clasificación con nivel de confianza; nada se contabiliza sin regla o aprobación _(propuesta)_
- [ ] Previsión a corto plazo con el historial real y el margen de error mostrado _(propuesta)_


## N6 — Gestión empresarial de cobros multicanal

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación multimoneda y multiempresa con eliminaciones y conciliación entre entidades _(propuesta)_
- [ ] Auditoría completa e inalterable de cada cambio, consultable y exportable _(propuesta)_
- [ ] Volumen: pruebas con cargas grandes (miles de documentos por mes) y cierres sin bloquear la operación _(propuesta)_

