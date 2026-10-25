---
id: VIII.03
capa: "VIII — TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO"
titulo: "Nómina electrónica y prestaciones sociales"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VIII.03 — Nómina electrónica y prestaciones sociales

> Escalera de madurez de la subcapa **VIII.03**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `payroll-runs`, `payroll-items`, `payslips`, `electronic-payroll-documents` |
| Eventos (outbox → webhooks) | `payroll.calculated`, `payroll.approved`, `payroll_document.accepted`, `payroll_document.rejected` |
| MCP · lectura | `get_payroll_run`, `list_payslips` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `calculate_payroll`, `submit_payroll_document` |
| Sistemas externos (puertos y adaptadores) | Nómina electrónica DIAN por proveedor tecnológico; PILA / operadores de seguridad social |

#### Integración

- [ ] API REST de lectura: payroll-runs, payroll-items, payslips, electronic-payroll-documents (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: payroll.calculated, payroll.approved, payroll_document.accepted, payroll_document.rejected (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_payroll_run, list_payslips (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: calculate_payroll, submit_payroll_document (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento normativo y componentes de nómina

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Nómina electrónica y prestaciones sociales»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Nómina electrónica y prestaciones sociales»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `payroll-runs`, `payroll-items`, `payslips`, `electronic-payroll-documents`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `payroll.calculated`, `payroll.approved`, `payroll_document.accepted`, `payroll_document.rejected`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Cálculo básico de nómina

#### Funcionalidad

- [ ] Exportar el costo de nómina
- [ ] Registro de empleados y contratos.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Deducciones, novedades, prestaciones y liquidaciones

#### Funcionalidad

- [ ] Liquidación de nómina
- [ ] Seguridad social y parafiscales
- [ ] Prestaciones
- [ ] Nómina electrónica DIAN
- [ ] Desprendible de pago
- [ ] Liquidación de nómina, seguridad social, prestaciones y nómina electrónica
- [ ] Asientos contables automáticos
- [ ] Pago de nómina

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con asistencia, empleados y contabilidad

#### Funcionalidad

- [ ] Pago masivo de nómina
- [ ] Contabilización automática
- [ ] Costos por centro de costo, sede u obra
- [ ] Retención en la fuente laboral
- [ ] Reportes
- [ ] Cierre de nómina por periodos
- [ ] Costo de personal por centro de costo, sede y proyecto.
- [ ] Anticipos, préstamos y descuentos
- [ ] Provisiones y conciliación

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Cálculos periódicos, validaciones y generación automatizada

#### Funcionalidad

- [ ] Multi-NIT y multi-empresa
- [ ] Nómina para varios países
- [ ] Simulador de costos
- [ ] Gestión de contratistas y prestadores de servicios
- [ ] Compensación variable y bonificaciones
- [ ] Planeación de plantilla
- [ ] Cumplimiento automatizado
- [ ] Multi-NIT y multiempresa
- [ ] Presupuesto y proyección de nómina
- [ ] Portal del empleado
- [ ] Contratistas y prestadores de servicios

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de costos laborales y detección de inconsistencias

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Nómina electrónica y prestaciones sociales» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de anomalías (montos atípicos, duplicados, desvíos frente al historial) con explicación de por qué se marcó _(propuesta)_
- [ ] Sugerencia de cuenta, impuesto o clasificación con nivel de confianza; nada se contabiliza sin regla o aprobación _(propuesta)_
- [ ] Previsión a corto plazo con el historial real y el margen de error mostrado _(propuesta)_


## N6 — Gestión empresarial de nómina y cumplimiento electrónico

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Transaccional (dinero y documentos)». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación multimoneda y multiempresa con eliminaciones y conciliación entre entidades _(propuesta)_
- [ ] Auditoría completa e inalterable de cada cambio, consultable y exportable _(propuesta)_
- [ ] Volumen: pruebas con cargas grandes (miles de documentos por mes) y cierres sin bloquear la operación _(propuesta)_

