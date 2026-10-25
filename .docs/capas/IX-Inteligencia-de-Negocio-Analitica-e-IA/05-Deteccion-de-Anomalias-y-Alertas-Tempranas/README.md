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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Detección de anomalías y alertas tempranas»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Detección de anomalías y alertas tempranas»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `alerts`, `alert-rules`, `anomalies`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `alert.raised`, `alert.acknowledged`, `anomaly.detected`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Analítico e inteligente». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Detección de anomalías y alertas tempranas» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Consulta en lenguaje natural sobre las métricas definidas, mostrando la definición usada _(propuesta)_
- [ ] Explicación de variaciones (qué cambió y por qué) citando las fuentes _(propuesta)_
- [ ] Pronóstico con intervalo de confianza y comparación contra lo ocurrido _(propuesta)_


## N6 — Sistema empresarial de alerta temprana y gestión de riesgos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Analítico e inteligente». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Métricas consolidadas entre sedes y empresas con permisos por dato _(propuesta)_
- [ ] Gobierno del dato: propietario, definición única y registro de cambios de cada métrica _(propuesta)_
- [ ] Rendimiento: caché y precálculo para que las consultas grandes no frenen la operación _(propuesta)_

