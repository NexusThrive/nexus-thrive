---
id: VII.00
capa: "VII — CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD"
titulo: "Caja menor y arqueos"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# VII.00 — Caja menor y arqueos

> Escalera de madurez de la subcapa **VII.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `cash-boxes`, `cash-shifts`, `cash-counts`, `cash-expenses` |
| Eventos (outbox → webhooks) | `cash_shift.opened`, `cash_shift.closed`, `cash_count.difference_found`, `cash_expense.recorded` |
| MCP · lectura | `get_cash_status`, `list_cash_expenses` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `record_cash_expense`, `close_cash_shift` |
| Sistemas externos (puertos y adaptadores) | OCR de soportes |

#### Integración

- [ ] API REST de lectura: cash-boxes, cash-shifts, cash-counts, cash-expenses (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: cash_shift.opened, cash_shift.closed, cash_count.difference_found, cash_expense.recorded (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_cash_status, list_cash_expenses (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: record_cash_expense, close_cash_shift (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de fondos, movimientos y reglas de caja

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro básico de ingresos y gastos

#### Funcionalidad

- [x] Apertura de caja — _hecho: turnos de caja menor_
- [x] Saldo en tiempo real — _hecho: saldo del turno_
- [x] Cierre y arqueo — _hecho: arqueo contra lo contado_
- [ ] Reporte simple del arqueo.
- [x] Registro de egresos
- [x] Registro de ingresos y reposiciones
- [x] Comprobante adjunto — _hecho: soporte del gasto, con escaneo OCR_
- [x] Listado y filtros

#### Técnico

- [x] Implementado en la rama actual (ver `git log` de cada feature)
- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Fondos, comprobantes, arqueos y cierres

#### Funcionalidad

- [x] Múltiples cajas — _hecho: varias cajas con fondo y responsable_
- [ ] Conteo por denominaciones
- [ ] Arqueo imprimible
- [ ] Traslado entre cajas
- [ ] Tope de fondo
- [ ] Estado de la caja: abierta, cerrada, en arqueo, bloqueada.
- [ ] Numeración consecutiva de vales
- [x] Reembolso y reposición de caja — _hecho: reposición del fondo_
- [x] Captura desde el celular — _hecho: escaneo del comprobante con la cámara (OCR)_
- [ ] Gastos con varios ítems o varias categorías
- [ ] Exportar a Excel y PDF.
- [x] Búsqueda — _hecho: filtros de cobros y gastos_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con usuarios, gastos y contabilidad

#### Funcionalidad

- [ ] Arqueos sorpresa
- [ ] Tratamiento de diferencias
- [ ] Cierre por periodos
- [ ] Caja sin cerrar
- [ ] Custodia
- [ ] Límite de efectivo en caja
- [ ] Anulaciones con motivo
- [ ] Reglas de soporte obligatorio
- [ ] Detección de duplicados
- [ ] Reposición con cuadre
- [ ] Gastos en moneda extranjera
- [ ] Adjuntos múltiples y versionados

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Conciliación, alertas y controles automatizados

#### Funcionalidad

- [ ] Cajas multi-negocio y multi-moneda
- [ ] Cajas virtuales o digitales
- [ ] Conciliación automática
- [ ] Arqueo con IA
- [ ] Cajas por proyecto u obra
- [ ] Cierre automático
- [ ] OCR de facturas
- [ ] Gastos recurrentes programados
- [ ] Registro por WhatsApp
- [ ] Sugerencia automática de categoría y centro de costo
- [ ] Importación masiva
- [ ] Firma digital

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de diferencias y análisis de gastos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Control empresarial de fondos y auditoría financiera

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

