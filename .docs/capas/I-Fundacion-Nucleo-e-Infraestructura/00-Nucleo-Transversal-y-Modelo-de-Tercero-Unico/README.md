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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas del contrato y de la superficie de integración de la subcapa. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Contrato de datos de «Núcleo transversal y modelo de tercero único»: entidades, estados y transiciones válidas, todas con `tenantId` y aisladas por organización _(propuesta)_
- [ ] Permisos de «Núcleo transversal y modelo de tercero único»: acciones (ver, crear, editar, aprobar, exportar) asignables por rol y aplicadas igual en pantalla, API y MCP _(propuesta)_
- [ ] Operaciones que ofrece a otras funciones: `parties`, `party-roles`, `addresses`, `contacts`, declaradas una sola vez en el registro de capacidades (de ahí salen la ruta REST, la herramienta MCP y la documentación) _(propuesta)_
- [ ] Eventos que emite y consume: `party.created`, `party.updated`, `party.merged`, con carga versionada y sin importar la lógica interna de otras funciones _(propuesta)_
- [ ] Dependencias hacia abajo declaradas: qué capacidades compartidas necesita y qué muestra si faltan (aviso que explica, no error) _(propuesta)_
- [ ] Apagar la función conserva sus datos: la pantalla y la API responden «función apagada» y no se borra nada _(propuesta)_
- [ ] Exportar e importar: declara qué recursos salen y entran, y en qué formatos (CSV, Excel, PDF, JSON), a través del motor de reportes y de datos _(propuesta)_
- [ ] Compuerta de estabilidad: las pruebas de aislamiento entre organizaciones y de contrato pasan antes de abrir el siguiente nivel _(propuesta)_


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

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Un tercero con varios roles a la vez (cliente, proveedor, empleado) con permisos por rol _(propuesta)_
- [ ] Datos legales validados: tipo de persona, documento, régimen y datos de facturación _(propuesta)_
- [ ] Direcciones y contactos múltiples con uno principal _(propuesta)_
- [ ] Consentimiento y finalidad del tratamiento de datos (Ley 1581) guardados por tercero _(propuesta)_
- [ ] Relaciones entre terceros (empresa y sus contactos, titular y beneficiarios) _(propuesta)_


## N3 — Integración de terceros entre módulos

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Ventas, compras, cartera, agenda y tickets usan el mismo tercero, sin copiar nombre ni documento _(propuesta)_
- [ ] Vista 360° del tercero: documentos, pagos, citas, tickets e historial _(propuesta)_
- [ ] Eventos party.created, party.updated y party.merged al outbox _(propuesta)_
- [ ] La fusión de terceros actualiza todas las referencias sin perder historial _(propuesta)_


## N4 — Sincronización y actualización automatizada

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de lo que ya describen los niveles vecinos. Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Validación del NIT con un proveedor externo, programada y con resultado guardado _(propuesta)_
- [ ] Alertas de datos faltantes o vencidos (documento, consentimiento, contacto) _(propuesta)_
- [ ] Propuesta periódica de limpieza (inactivos, duplicados probables) para aprobar _(propuesta)_


## N5 — Resolución inteligente de duplicados y relaciones

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Maestro de datos». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Asistente de «Núcleo transversal y modelo de tercero único» sobre el servicio de IA de la plataforma (IX.04): propone con su explicación y una persona aprueba; no ejecuta solo sin permiso explícito _(propuesta)_
- [ ] Detección de duplicados y de datos incompletos con puntaje de confianza; la fusión la aprueba una persona y es reversible _(propuesta)_
- [ ] Completar y normalizar datos desde fuentes externas, con la fuente y la fecha guardadas _(propuesta)_
- [ ] Medición de calidad del dato (completitud, duplicados, antigüedad) visible por organización _(propuesta)_


## N6 — Modelo empresarial unificado y extensible

> Propuesta de tareas (2026-10-25, por aprobar): derivadas de la plantilla del arquetipo «Maestro de datos». Ninguna está hecha: marcar solo con evidencia.

#### Funcionalidad

- [ ] Consolidación entre varias sedes o empresas de la misma persona, con permisos por organización _(propuesta)_
- [ ] Reglas de retención, anonimización y borrado a pedido (Ley 1581) _(propuesta)_
- [ ] Límites por plan y consumo medido, sin bloquear funciones _(propuesta)_

