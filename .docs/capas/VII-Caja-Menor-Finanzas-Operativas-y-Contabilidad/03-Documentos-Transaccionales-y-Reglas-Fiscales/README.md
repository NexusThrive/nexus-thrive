---
id: VII.03
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Documentos transaccionales y reglas fiscales"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VII.03 — Documentos transaccionales y reglas fiscales

> Escalera de madurez de la subcapa **VII.03**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `tax-rules`, `withholdings`, `document-numbering`, `fiscal-documents` |
| Eventos (outbox → webhooks) | `document.numbered`, `tax_rule.changed` |
| MCP · lectura | `calculate_taxes`, `list_tax_rules` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `update_tax_rule` |
| Sistemas externos (puertos y adaptadores) | Tablas de impuestos DIAN (IVA, retenciones, ICA) |

#### Integración

- [ ] API REST de lectura: tax-rules, withholdings, document-numbering, fiscal-documents (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: document.numbered, tax_rule.changed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: calculate_taxes, list_tax_rules (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: update_tax_rule (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de documentos, impuestos y reglas aplicables

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Documentos transaccionales y reglas fiscales»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Documentos transaccionales y reglas fiscales»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `tax-rules`, `withholdings`, `document-numbering`, `fiscal-documents`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `document.numbered`, `tax_rule.changed`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro de documentos transaccionales básicos

#### Funcionalidad

- [ ] Documento transaccional unificado
- [x] Impuestos y retenciones parametrizables con vigencia _hecho: lib/tax + app/[tenant]/(app)/taxes (tarifas con vigencia y retenciones)_
- [x] Numeración y resoluciones _hecho: NumberingResolution; el consecutivo sale del rango y avisa/bloquea_
- [ ] Multi-moneda y tasas de cambio
- [ ] Beneficiario _(PR-13)_
- [ ] Tipo de comprobante _(PR-13)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Validación, estados, impuestos y notas relacionadas

#### Funcionalidad

- [ ] Ficha del tercero
- [ ] Tipo de soporte
- [ ] Búsqueda y creación rápida
- [ ] Verificación de duplicados
- [ ] Historial por proveedor

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con ventas, compras y contabilidad

#### Funcionalidad

- [ ] Documento soporte en adquisiciones a no obligados a facturar
- [ ] Impuestos por gasto
- [ ] Régimen y responsabilidades del tercero
- [ ] Validación del NIT
- [ ] Alertas de gastos sin soporte válido
- [ ] Control de pagos en efectivo
- [ ] Archivo del soporte

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Aplicación automatizada de reglas y validaciones fiscales

#### Funcionalidad

- [ ] Lectura de la factura electrónica (XML o código QR)
- [ ] Validación de la factura contra la DIAN
- [ ] Consulta del RUT y de listas restrictivas
- [ ] Cruce con las facturas de proveedores que llegan al correo
- [ ] Gestión de terceros ocasionales
- [ ] Retenciones y certificados automáticos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de inconsistencias y análisis tributario

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Documentos transaccionales y reglas fiscales» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de anomalías (montos atípicos, duplicados, desvíos frente al historial) con explicación de por qué se marcó _(propuesta)_
- [ ] Sugerencia de cuenta, impuesto o clasificación con nivel de confianza; nada se contabiliza sin regla o aprobación _(propuesta)_
- [ ] Previsión a corto plazo con el historial real y el margen de error mostrado _(propuesta)_


## N6 — Motor fiscal configurable, versionado y auditable

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación multimoneda y multiempresa con eliminaciones y conciliación entre entidades _(propuesta)_
- [ ] Auditoría completa e inalterable de cada cambio, consultable y exportable _(propuesta)_
- [ ] Volumen: pruebas con cargas grandes (miles de documentos por mes) y cierres sin bloquear la operación _(propuesta)_

