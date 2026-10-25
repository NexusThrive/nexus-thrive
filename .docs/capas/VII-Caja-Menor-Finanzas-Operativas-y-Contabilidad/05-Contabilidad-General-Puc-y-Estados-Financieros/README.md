---
id: VII.05
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Contabilidad general, PUC y estados financieros"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VII.05 — Contabilidad general, PUC y estados financieros

> Escalera de madurez de la subcapa **VII.05**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `chart-of-accounts`, `journal-entries`, `ledgers`, `financial-statements`, `accounting-exports` |
| Eventos (outbox → webhooks) | `journal_entry.posted`, `period.closed`, `export.ready` |
| MCP · lectura | `get_trial_balance`, `get_financial_statement` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `post_journal_entry`, `close_period` |
| Sistemas externos (puertos y adaptadores) | Exportación al contador (Siigo, World Office, Alegra, archivos planos) |

#### Integración

- [ ] API REST de lectura: chart-of-accounts, journal-entries, ledgers, financial-statements, accounting-exports (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: journal_entry.posted, period.closed, export.ready (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_trial_balance, get_financial_statement (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: post_journal_entry, close_period (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento contable, plan de cuentas y periodos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Contabilidad general, PUC y estados financieros»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Contabilidad general, PUC y estados financieros»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `chart-of-accounts`, `journal-entries`, `ledgers`, `financial-statements`, `accounting-exports`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `journal_entry.posted`, `period.closed`, `export.ready`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Registro básico de cuentas y asientos

#### Funcionalidad

- [x] Reportes simples _(PR-23)_
- [x] Exportación _(PR-23)_
- [ ] Categorías de ingresos y gastos.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Libro diario, mayor, comprobantes y cierres

#### Funcionalidad

- [x] Plan de cuentas (PUC) _(PR-21)_
- [x] Asientos automáticos _(PR-22)_
- [ ] Comprobantes contables manuales
- [x] Libros auxiliares, libro diario, libro mayor y balance de prueba. _(PR-23)_
- [ ] Terceros y centros de costo en cada asiento _(PR-22)_
- [x] Reportes para el contador _(PR-23)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con ventas, compras, pagos e impuestos

#### Funcionalidad

- [ ] Estados financieros
- [ ] Cierre contable por periodos
- [ ] Activos fijos
- [ ] Diferidos, provisiones y causaciones
- [ ] Conciliación entre módulos y contabilidad
- [ ] Ajustes por inflación y por diferencia en cambio
- [ ] Soporte de NIIF

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Generación automática de asientos y conciliaciones

#### Funcionalidad

- [ ] Multiempresa y consolidación
- [ ] Costeo avanzado
- [ ] Contabilidad multi-libro o multi-norma
- [ ] Rentabilidad por cliente, producto, canal, proyecto y sede
- [ ] Cierre asistido con IA
- [ ] Auditoría externa y revisoría fiscal
- [ ] Integración bidireccional con Siigo, Alegra y World Office

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis contable y detección de anomalías

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Contabilidad general, PUC y estados financieros» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de anomalías (montos atípicos, duplicados, desvíos frente al historial) con explicación de por qué se marcó _(propuesta)_
- [ ] Sugerencia de cuenta, impuesto o clasificación con nivel de confianza; nada se contabiliza sin regla o aprobación _(propuesta)_
- [ ] Previsión a corto plazo con el historial real y el margen de error mostrado _(propuesta)_


## N6 — Contabilidad empresarial multientidad y cierres controlados

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación multimoneda y multiempresa con eliminaciones y conciliación entre entidades _(propuesta)_
- [ ] Auditoría completa e inalterable de cada cambio, consultable y exportable _(propuesta)_
- [ ] Volumen: pruebas con cargas grandes (miles de documentos por mes) y cierres sin bloquear la operación _(propuesta)_

