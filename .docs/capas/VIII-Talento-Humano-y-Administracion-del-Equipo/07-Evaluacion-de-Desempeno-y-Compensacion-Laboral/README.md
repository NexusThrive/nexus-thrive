---
id: VIII.07
capa: "VIII — TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO"
titulo: "Evaluación de desempeño y compensación laboral"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VIII.07 — Evaluación de desempeño y compensación laboral

> Escalera de madurez de la subcapa **VIII.07**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `review-cycles`, `reviews`, `goals`, `compensation-bands` |
| Eventos (outbox → webhooks) | `review.submitted`, `review_cycle.closed`, `compensation.changed` |
| MCP · lectura | `get_review`, `list_goals` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `submit_review` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: review-cycles, reviews, goals, compensation-bands (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: review.submitted, review_cycle.closed, compensation.changed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: get_review, list_goals (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: submit_review (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de desempeño, metas y compensación

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Comisiones simples y evaluación manual

#### Funcionalidad

- [ ] Comisiones simples
- [ ] Reporte mensual
- [ ] Evaluación manual

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Reglas de comisión, metas y evaluaciones periódicas

#### Funcionalidad

- [ ] Reglas de comisión
- [ ] Cálculo automático desde las ventas
- [ ] Metas individuales y de equipo
- [ ] Evaluaciones periódicas
- [ ] Comentarios y objetivos acordados
- [ ] Comisión ligada al pago del cliente

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Esquemas complejos, clawback y evaluación 360

#### Funcionalidad

- [ ] Esquemas complejos
- [ ] Reglas de clawback
- [ ] Aprobación de liquidaciones
- [ ] Evaluación 360°
- [ ] OKR y KPI por cargo
- [ ] Calibración
- [ ] Planes de mejora
- [ ] Reportes
- [ ] Transparencia

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — OKR/KPI, calibración y planes de mejora

#### Funcionalidad

- [ ] Motor de compensación
- [ ] Desempeño en tiempo real
- [ ] IA
- [ ] Matriz de talento
- [ ] Reconocimiento entre pares
- [ ] Equidad salarial
- [ ] Comisiones para canales externos
- [ ] Integración con pagos y contabilidad

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Motor de compensación y desempeño en tiempo real

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Talento empresarial: matriz, sucesión y equidad salarial

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

