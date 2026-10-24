---
id: IX.02
capa: "IX — INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA"
titulo: "Analítica de clientes y comportamiento comercial"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# IX.02 — Analítica de clientes y comportamiento comercial

> Escalera de madurez de la subcapa **IX.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `customer-segments`, `cohorts`, `rfm-scores` |
| Eventos (outbox → webhooks) | `segment.updated`, `customer.churn_risk_detected` |
| MCP · lectura | `list_segments`, `get_cohort`, `get_customer_value` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_segment` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: customer-segments, cohorts, rfm-scores (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: segment.updated, customer.churn_risk_detected (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_segments, get_cohort, get_customer_value (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_segment (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de comportamiento, segmentos y conversiones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Métricas básicas de clientes y ventas

#### Funcionalidad

- [x] Ficha del cliente con totales — _hecho: ficha 360° con métricas_
- [ ] Clientes nuevos vs. recurrentes.
- [ ] Origen del cliente
- [ ] Lista de clientes inactivos.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Segmentación, cohortes y análisis de recorridos

#### Funcionalidad

- [ ] Valor del cliente (LTV) simple
- [ ] Costo de adquisición (CAC) por canal
- [ ] Tasa de retención y recompra
- [ ] Segmentación RFM
- [ ] Embudo por canal
- [ ] Rentabilidad por canal

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración de CRM, campañas, ventas y atención

#### Funcionalidad

- [ ] Análisis de cohortes
- [ ] LTV con margen
- [ ] Churn y bajas
- [ ] Atribución multicanal
- [ ] Rentabilidad por cliente, producto, servicio, sede y vendedor
- [ ] Listas dinámicas para acción
- [ ] Satisfacción vinculada

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Segmentación y generación automatizada de alertas

#### Funcionalidad

- [ ] LTV predictivo
- [ ] Predicción de abandono
- [ ] Próxima mejor acción
- [ ] Modelos de atribución avanzados
- [ ] Optimización del presupuesto de marketing
- [ ] Análisis de precio y elasticidad
- [ ] Customer 360

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Predicción de conversión, abandono y valor del cliente

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Inteligencia comercial empresarial multicanal

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

