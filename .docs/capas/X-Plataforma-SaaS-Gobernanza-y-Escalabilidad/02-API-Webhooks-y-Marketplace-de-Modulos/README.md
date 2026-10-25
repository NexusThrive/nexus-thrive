---
id: X.02
capa: "X — PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD"
titulo: "API, webhooks y marketplace de módulos"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# X.02 — API, webhooks y marketplace de módulos

> Escalera de madurez de la subcapa **X.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `api-keys`, `oauth-clients`, `api-usage`, `openapi (documento)`, `mcp (servidor)` |
| Eventos (outbox → webhooks) | `api_key.created`, `api_key.revoked`, `api.rate_limited` |
| MCP · lectura | `list_api_keys`, `get_api_usage`, `describe_api` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_api_key`, `revoke_api_key` |
| Sistemas externos (puertos y adaptadores) | Es la puerta de todas las demás: genera REST, MCP y OpenAPI desde el registro de capacidades |

#### Integración

- [ ] API REST de lectura: api-keys, oauth-clients, api-usage, openapi (documento), mcp (servidor) (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: api_key.created, api_key.revoked, api.rate_limited (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_api_keys, get_api_usage, describe_api (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_api_key, revoke_api_key (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de contratos, recursos y estándares de integración

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «API, webhooks y marketplace de módulos»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «API, webhooks y marketplace de módulos»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `api-keys`, `oauth-clients`, `api-usage`, `openapi (documento)`, `mcp (servidor)`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `api_key.created`, `api_key.revoked`, `api.rate_limited`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


## N1 — API básica con autenticación

#### Funcionalidad

- [x] Llaves de API por negocio _(PR-02)_ _hecho: lib/api/keys.ts + Ajustes → Integraciones_
- [x] API REST documentada _(PR-02)_ _hecho: GET /api/v1/openapi.json, generado del registro_
- [x] Límite de peticiones _(PR-02)_ _hecho: lib/api/rate-limit.ts, 120/min por llave, en memoria_
- [x] API interna `/api/v1` de solo lectura sobre los repositorios de `lib/` (contexto, permisos, módulos y bitácora) _(objetivo 2026 · ver `docs/PENDIENTES.md`)_ _(PR-02)_ _hecho: app/api/v1 + lib/api/handler.ts_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Versionado, validación, documentación y límites de consumo

#### Funcionalidad

- [ ] Documentación pública interactiva _(PR-02)_
- [x] Alcances (scopes) granulares _(PR-02)_ _hecho: lib/api/scopes.ts_
- [x] Versionado de la API _(PR-02)_ _hecho: prefijo /api/v1_
- [ ] OAuth 2.0
- [ ] Conectores listos
- [x] MCP de NEXUS: capa delgada sobre la misma API, sin reglas propias _(objetivo 2026 · ver `docs/PENDIENTES.md`)_ _(PR-04)_ _hecho: lib/mcp/server.ts + app/api/mcp (solo lectura)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integraciones externas, webhooks y conectores

#### Funcionalidad

- [ ] Límites por plan y por llave
- [ ] Idempotencia y paginación
- [ ] SDK oficiales
- [ ] Registro y auditoría de cada llamada
- [ ] Directorio de integraciones
- [ ] Entornos de prueba por cliente
- [ ] Estado y métricas de la API

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Flujos de integración y gestión automatizada de errores

#### Funcionalidad

- [ ] Marketplace abierto de módulos y plugins
- [ ] Programa de desarrolladores y socios
- [ ] Extensibilidad profunda
- [ ] Aislamiento de plugins
- [ ] Servidor MCP / herramientas para agentes de IA
- [ ] Facturación y liquidación a desarrolladores
- [ ] Revisión continua

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Catálogo de conectores, métricas y optimización

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «API, webhooks y marketplace de módulos» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de patrones anómalos (accesos, eventos, volúmenes) con aviso al responsable _(propuesta)_
- [ ] Resumen en lenguaje natural de lo ocurrido (auditoría, eventos, entregas) para quien no es técnico _(propuesta)_
- [ ] Sugerencia de reglas y límites según el uso real de la organización _(propuesta)_


## N6 — Ecosistema extensible: marketplace, plugins y servidor MCP

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Motor de plataforma». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Operación de miles de organizaciones: aislamiento comprobado, límites por organización y degradación controlada _(propuesta)_
- [ ] Gobierno: quién puede qué, quién lo hizo y cuándo, exportable para una auditoría externa _(propuesta)_
- [ ] Observabilidad: métricas, alertas y plan de recuperación con tiempos definidos y probados _(propuesta)_

