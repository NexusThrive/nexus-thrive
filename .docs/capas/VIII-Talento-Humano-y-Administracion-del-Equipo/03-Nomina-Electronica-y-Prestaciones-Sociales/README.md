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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gestión empresarial de nómina y cumplimiento electrónico

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

