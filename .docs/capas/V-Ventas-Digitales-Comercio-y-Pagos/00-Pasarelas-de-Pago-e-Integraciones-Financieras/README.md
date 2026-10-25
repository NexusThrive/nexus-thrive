---
id: V.00
capa: "V — VENTAS DIGITALES, COMERCIO Y PAGOS"
titulo: "Pasarelas de pago e integraciones financieras"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# V.00 — Pasarelas de pago e integraciones financieras

> Escalera de madurez de la subcapa **V.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `payment-providers`, `payment-intents`, `payments`, `refunds`, `reconciliations` |
| Eventos (outbox → webhooks) | `payment.created`, `payment.confirmed`, `payment.failed`, `payment.refunded`, `reconciliation.completed` |
| MCP · lectura | `list_payments`, `get_payment`, `get_reconciliation` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_payment_intent`, `refund_payment` |
| Sistemas externos (puertos y adaptadores) | Nequi, Wompi, Bold, MercadoPago, PSE, Stripe; cada uno detrás de un puerto de pagos con webhook entrante verificado e idempotente |

#### Integración

- [ ] API REST de lectura: payment-providers, payment-intents, payments, refunds, reconciliations (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: payment.created, payment.confirmed, payment.failed, payment.refunded, reconciliation.completed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_payments, get_payment, get_reconciliation (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_payment_intent, refund_payment (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de pagos, proveedores y estados

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Pasarelas de pago e integraciones financieras»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Pasarelas de pago e integraciones financieras»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `payment-providers`, `payment-intents`, `payments`, `refunds`, `reconciliations`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `payment.created`, `payment.confirmed`, `payment.failed`, `payment.refunded`, `reconciliation.completed`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Integración con una pasarela de pago

#### Funcionalidad

- [ ] Una pasarela (Wompi o la que elijas) conectada _(PR-06)_
- [ ] Pago con tarjeta, PSE y Nequi desde un checkout alojado por la pasarela. _(PR-17)_
- [x] Confirmación de pago por webhook y estado visible en la orden. _(PR-17)_
- [ ] Nequi Negocios: QR dinámico e intención de cobro; solo se registra el ingreso con el estado oficial _(objetivo 2026 · ver `docs/PENDIENTES.md`)_ _(PR-17)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión de transacciones, errores y conciliación básica

#### Funcionalidad

- [x] Varias pasarelas _(PR-19)_
- [ ] Métodos locales completos
- [x] Reembolsos totales y parciales _(PR-17)_
- [ ] Pagos parciales y depósitos
- [x] Conciliación diaria _(PR-17)_
- [ ] Cuotas y pagos en moneda extranjera según la pasarela.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con múltiples proveedores y módulos

#### Funcionalidad

- [ ] Enrutamiento entre pasarelas
- [ ] Registro de comisiones
- [ ] Gestión de contracargos
- [ ] Reintentos de cobros fallidos
- [ ] Pagos divididos
- [ ] Límites y aprobaciones
- [ ] Reportes de aprobación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Webhooks, reintentos y conciliación automatizada

#### Funcionalidad

- [ ] Modelo de plataforma de pagos
- [ ] Pagos a terceros y dispersión
- [ ] Tokenización de tarjeta
- [ ] Antifraude con reglas e IA
- [ ] Billetera interna y saldo a favor.
- [ ] Conciliación automática con el banco
- [ ] Otros rieles

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de anomalías y optimización de pagos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Pasarelas de pago e integraciones financieras» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de anomalías (montos atípicos, duplicados, desvíos frente al historial) con explicación de por qué se marcó _(propuesta)_
- [ ] Sugerencia de cuenta, impuesto o clasificación con nivel de confianza; nada se contabiliza sin regla o aprobación _(propuesta)_
- [ ] Previsión a corto plazo con el historial real y el margen de error mostrado _(propuesta)_


## N6 — Orquestación de pagos empresarial y resiliencia

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación multimoneda y multiempresa con eliminaciones y conciliación entre entidades _(propuesta)_
- [ ] Auditoría completa e inalterable de cada cambio, consultable y exportable _(propuesta)_
- [ ] Volumen: pruebas con cargas grandes (miles de documentos por mes) y cierres sin bloquear la operación _(propuesta)_

