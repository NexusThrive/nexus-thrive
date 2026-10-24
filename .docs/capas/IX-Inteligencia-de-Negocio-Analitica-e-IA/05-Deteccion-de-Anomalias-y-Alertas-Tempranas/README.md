---
id: IX.05
capa: "IX — INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA"
titulo: "Detección de anomalías y alertas tempranas"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# IX.05 — Detección de anomalías y alertas tempranas

> Escalera de madurez de la subcapa **IX.05**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `alerts`, `alert-rules`, `anomalies` |
| Eventos (outbox → webhooks) | `alert.raised`, `alert.acknowledged`, `anomaly.detected` |
| MCP · lectura | `list_alerts`, `get_anomaly` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_alert_rule`, `acknowledge_alert` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: alerts, alert-rules, anomalies (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: alert.raised, alert.acknowledged, anomaly.detected (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_alerts, get_anomaly (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_alert_rule, acknowledge_alert (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de riesgos, umbrales y eventos críticos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Alertas basadas en reglas simples

#### Funcionalidad

- [x] Alertas por reglas fijas — _hecho: avisos de vencimientos, stock bajo y citas (solo en la app)_
- [ ] Entrega por la app, correo o WhatsApp.
- [ ] Activar o desactivar

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Umbrales configurables y seguimiento de incidencias

#### Funcionalidad

- [ ] Umbrales configurables por negocio
- [ ] Alertas entre módulos
- [ ] Prioridad y agrupación
- [ ] Responsable y estado
- [ ] Alertas de cierre
- [ ] Horarios de silencio

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración de datos y alertas entre módulos

#### Funcionalidad

- [ ] Alertas comparadas con el comportamiento normal
- [ ] Detección de anomalías en dinero
- [ ] Anomalías operativas
- [ ] Alertas de seguridad
- [ ] Escalamiento automático
- [ ] Acciones sugeridas
- [ ] Métricas de las alertas

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Detección y notificación automatizadas

#### Funcionalidad

- [ ] Modelos de detección con aprendizaje
- [ ] Antifraude avanzado
- [ ] Alertas predictivas
- [ ] Correlación de eventos
- [ ] Monitoreo de salud de la plataforma por negocio
- [ ] Respuesta automática
- [ ] Centro de control del SuperAdmin

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Modelos predictivos y análisis de patrones anómalos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Sistema empresarial de alerta temprana y gestión de riesgos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

