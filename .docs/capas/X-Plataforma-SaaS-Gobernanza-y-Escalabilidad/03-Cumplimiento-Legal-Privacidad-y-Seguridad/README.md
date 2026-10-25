---
id: X.03
capa: "X — PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD"
titulo: "Cumplimiento legal, privacidad y seguridad"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# X.03 — Cumplimiento legal, privacidad y seguridad

> Escalera de madurez de la subcapa **X.03**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `consents`, `data-requests`, `retention-policies`, `security-events` |
| Eventos (outbox → webhooks) | `consent.changed`, `data_request.opened`, `data_request.completed`, `security.anomaly_detected` |
| MCP · lectura | `list_data_requests`, `get_retention_policy` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `open_data_request` |
| Sistemas externos (puertos y adaptadores) | Habeas data (Ley 1581), SuperIndustria |

#### Integración

- [ ] API REST de lectura: consents, data-requests, retention-policies, security-events (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: consent.changed, data_request.opened, data_request.completed, security.anomaly_detected (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_data_requests, get_retention_policy (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: open_data_request (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de riesgos, obligaciones y políticas de seguridad

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Cumplimiento legal, privacidad y seguridad»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Cumplimiento legal, privacidad y seguridad»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `consents`, `data-requests`, `retention-policies`, `security-events`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `consent.changed`, `data_request.opened`, `data_request.completed`, `security.anomaly_detected`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — Controles básicos, privacidad y gestión de consentimientos

#### Funcionalidad

- [x] Política de tratamiento de datos personales — _hecho: landing `/privacidad`_
- [x] Aviso de privacidad — _hecho: landing `/privacidad`, `/terminos`, `/cookies`_
- [ ] Casilla de autorización
- [ ] Canal para solicitudes

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Protección de datos, retención y gestión de solicitudes

#### Funcionalidad

- [ ] Registro de consentimientos
- [ ] Baja fácil
- [ ] Banner de cookies
- [ ] Plantillas legales por negocio
- [ ] Contrato de encargo de tratamiento
- [ ] Atención de derechos del titular

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración de controles con identidad, auditoría y módulos

#### Funcionalidad

- [ ] Mapa de datos personales
- [ ] Políticas de retención y eliminación automática
- [ ] Gestión de incidentes y brechas
- [ ] Registro Nacional de Bases de Datos (RNBD)
- [ ] Evaluaciones de riesgo
- [ ] Datos sensibles y de menores
- [ ] Reglas de contacto comercial y de cobranza
- [ ] Transferencias internacionales
- [ ] Evidencia de firma y de mensajes de datos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Revisiones, alertas y evidencias de cumplimiento automatizadas

#### Funcionalidad

- [ ] Programa integral de gestión de datos personales
- [ ] Cumplimiento multi-país
- [ ] Certificaciones
- [ ] Centro de confianza (Trust Center)
- [ ] Gestión automatizada de solicitudes de titulares
- [ ] Control de proveedores y subencargados
- [ ] Cumplimiento por vertical
- [ ] Gobernanza de IA

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de riesgos y supervisión continua de controles

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Cumplimiento legal, privacidad y seguridad» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Gobierno empresarial de seguridad, privacidad y cumplimiento

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

