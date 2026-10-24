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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


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

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Ecosistema extensible: marketplace, plugins y servidor MCP

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

