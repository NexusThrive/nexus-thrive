---
id: I.00
capa: "I — FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
titulo: "Núcleo transversal y modelo de tercero único"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# I.00 — Núcleo transversal y modelo de tercero único

> Escalera de madurez de la subcapa **I.00**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `parties`, `party-roles`, `addresses`, `contacts` |
| Eventos (outbox → webhooks) | `party.created`, `party.updated`, `party.merged` |
| MCP · lectura | `search_parties`, `get_party` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `create_party`, `merge_parties` |
| Sistemas externos (puertos y adaptadores) | RUES / DIAN (consulta de NIT, vía proveedor) |

#### Integración

- [ ] API REST de lectura: parties, party-roles, addresses, contacts (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: party.created, party.updated, party.merged (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: search_parties, get_party (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: create_party, merge_parties (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento del modelo de terceros

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro centralizado de terceros

#### Funcionalidad

- [x] Tercero único con roles _(PR-08)_ _hecho: lib/parties/parties-db.ts (Party, PartyRole; cada cliente guardado tiene su tercero)_
- [ ] Documento transaccional unificado
- [x] Motor contable _(PR-22)_
- [x] Libro mayor inalterable _(PR-22)_
- [x] Impuestos y retenciones parametrizables con vigencia _hecho: lib/tax + app/[tenant]/(app)/taxes (tarifas con vigencia y retenciones)_
- [x] Dimensiones analíticas _(PR-21)_
- [x] Periodos y cierres _(PR-21)_
- [x] Numeración y resoluciones _hecho: NumberingResolution; el consecutivo sale del rango y avisa/bloquea_
- [ ] Multi-moneda y tasas de cambio
- [ ] Motor de aprobaciones, bitácora global y permisos

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Gestión completa de identidades comerciales y personales

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N3 — Integración de terceros entre módulos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N4 — Sincronización y actualización automatizada

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N5 — Resolución inteligente de duplicados y relaciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Modelo empresarial unificado y extensible

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

