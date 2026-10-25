---
id: VII.02
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Cuentas por cobrar, cuentas por pagar y cartera"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VII.02 — Cuentas por cobrar, cuentas por pagar y cartera

> Escalera de madurez de la subcapa **VII.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `receivables`, `payables`, `aging`, `collection-reminders`, `payments-applied` |
| Eventos (outbox → webhooks) | `receivable.created`, `receivable.overdue`, `payable.due`, `payment.applied` |
| MCP · lectura | `get_receivables_aging`, `list_overdue_customers`, `list_payables_due` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `apply_payment`, `send_collection_reminder` |
| Sistemas externos (puertos y adaptadores) | Bancos (conciliación), WhatsApp / correo para recordatorios |

#### Integración

- [ ] API REST de lectura: receivables, payables, aging, collection-reminders, payments-applied (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: receivable.created, receivable.overdue, payable.due, payment.applied (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_receivables_aging, list_overdue_customers, list_payables_due (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: apply_payment, send_collection_reminder (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de obligaciones, vencimientos y saldos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Cuentas por cobrar, cuentas por pagar y cartera»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Cuentas por cobrar, cuentas por pagar y cartera»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `receivables`, `payables`, `aging`, `collection-reminders`, `payments-applied`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `receivable.created`, `receivable.overdue`, `payable.due`, `payment.applied`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro básico de cuentas por cobrar y pagar

#### Funcionalidad

- [x] Cuentas por cobrar _hecho: receiveInvoicePayment + /cartera (abonos, saldo, antigüedad)_
- [x] Cuentas por pagar _hecho: paySupplierInvoice + SupplierPayment_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Vencimientos, abonos, saldos y estados de cartera

#### Funcionalidad

- [ ] Cartera por edades
- [ ] Recaudos aplicados a facturas
- [ ] Pagos a proveedores
- [ ] Recordatorios de cobro

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con ventas, compras, facturación y pagos

#### Funcionalidad

- [ ] Cobranza estructurada
- [ ] Anticipos, cruces y compensaciones
- [ ] Provisión de cartera
- [ ] Retenciones practicadas y sufridas
- [ ] Reportes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Recordatorios, aplicación de pagos y conciliación automatizados

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Recordatorios de vencimiento escalonados (antes, el día, después) _(propuesta)_
- [ ] Aplicación automática de pagos por referencia o monto _(propuesta)_
- [ ] Conciliación bancaria con importación de extracto y propuestas de cruce _(propuesta)_
- [ ] Reporte de cartera por edades enviado en forma programada _(propuesta)_


## N5 — Predicción de recaudo y análisis de riesgo de cartera

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Cuentas por cobrar, cuentas por pagar y cartera» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de anomalías (montos atípicos, duplicados, desvíos frente al historial) con explicación de por qué se marcó _(propuesta)_
- [ ] Sugerencia de cuenta, impuesto o clasificación con nivel de confianza; nada se contabiliza sin regla o aprobación _(propuesta)_
- [ ] Previsión a corto plazo con el historial real y el margen de error mostrado _(propuesta)_


## N6 — Gestión financiera empresarial de obligaciones y liquidez

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación multimoneda y multiempresa con eliminaciones y conciliación entre entidades _(propuesta)_
- [ ] Auditoría completa e inalterable de cada cambio, consultable y exportable _(propuesta)_
- [ ] Volumen: pruebas con cargas grandes (miles de documentos por mes) y cierres sin bloquear la operación _(propuesta)_

