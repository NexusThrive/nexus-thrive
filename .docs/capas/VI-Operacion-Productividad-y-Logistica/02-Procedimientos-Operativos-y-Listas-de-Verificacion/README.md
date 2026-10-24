---
id: VI.02
capa: "VI — OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA"
titulo: "Procedimientos operativos y listas de verificación"
type: subcapa
created: 2026-10-08
updated: 2026-10-08
tags: [capas, estructura, subcapa]
---

# VI.02 — Procedimientos operativos y listas de verificación

> Escalera de madurez de la subcapa **VI.02**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

<!-- integracion:inicio -->
## 🔌 Superficie de integración (API · MCP · Webhooks)

> **Regla:** todo lo que esta subcapa hace lo puede hacer también un sistema (API), un agente de IA (MCP) o un flujo de n8n (webhooks). Se define **una vez** en el registro de capacidades y de ahí salen la ruta REST, la herramienta MCP, el evento y la documentación. Reglas y estándares: [`integracion-api-mcp-webhooks.md`](../../../integracion-api-mcp-webhooks.md).

| Superficie | Detalle |
| --- | --- |
| API REST (`/api/v1`) | `procedures`, `checklists`, `checklist-runs` |
| Eventos (outbox → webhooks) | `checklist.started`, `checklist.completed`, `checklist.item_failed` |
| MCP · lectura | `list_checklists`, `get_checklist_run` |
| MCP · escritura (proponen; aprueba una persona o una llave con permiso explícito) | `start_checklist`, `complete_checklist_item` |
| Sistemas externos (puertos y adaptadores) | — |

#### Integración

- [ ] API REST de lectura: procedures, checklists, checklist-runs (N1–N2) <!-- api-lectura -->
- [ ] API de escritura con idempotencia y permisos (N2) <!-- api-escritura -->
- [ ] Eventos de dominio al outbox y webhooks firmados: checklist.started, checklist.completed, checklist.item_failed (N3) <!-- eventos -->
- [ ] Herramientas MCP de lectura: list_checklists, get_checklist_run (N2) <!-- mcp-lectura -->
- [ ] Herramientas MCP de escritura con aprobación: start_checklist, complete_checklist_item (N3–N4) <!-- mcp-escritura -->
- [ ] Documentada: OpenAPI, ejemplo de flujo en n8n y pruebas de contrato (N3) <!-- docs -->
<!-- integracion:fin -->

## N0 — Fundamento de procedimientos y controles operativos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Listas de verificación básicas

#### Funcionalidad

- [ ] Checklists simples
- [ ] Asignar a una persona y fecha.
- [ ] Plantillas reutilizables.

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Procedimientos versionados, responsables y evidencias

#### Funcionalidad

- [ ] Checklists recurrentes
- [ ] Ítems con evidencia
- [ ] Procedimientos con pasos
- [ ] Plantillas por vertical
- [ ] Historial de cumplimiento

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Integración con tareas, activos y auditoría

#### Funcionalidad

- [ ] Campos obligatorios y reglas
- [ ] Ramificación
- [ ] Aprobación y firma
- [ ] Versionado de procedimientos
- [ ] Indicadores
- [ ] Auditoría interna

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Ejecución programada y escalamiento automatizado

#### Funcionalidad

- [ ] Procesos con flujo completo
- [ ] IA que convierte un video o una descripción en SOP
- [ ] Asistente de proceso en el celular
- [ ] Capacitación ligada al SOP
- [ ] Biblioteca de mejores prácticas
- [ ] Cumplimiento normativo

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Análisis de cumplimiento y detección de desviaciones

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Gobierno empresarial de procesos operativos

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

