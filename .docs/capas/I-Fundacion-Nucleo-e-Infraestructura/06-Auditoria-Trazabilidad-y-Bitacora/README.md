---
id: I.06
capa: "I — FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA"
titulo: "Auditoría, trazabilidad y bitácora"
type: subcapa
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, subcapa]
---

# I.06 — Auditoría, trazabilidad y bitácora

> Escalera de madurez de la subcapa **I.06**. N1–N4 provienen de `DesordenadoCapas.md`; N0, N5 y N6 son niveles de escalera (contenido por desarrollar).

> **Checks**: `- [x]` = funcionalidad ya implementada en la rama actual; `- [ ]` = pendiente. Técnico va separado del conceptual.

## N0 — Fundamento de auditoría y eventos registrables

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N1 — Registro básico de acciones

#### Funcionalidad

- [x] Registro de acciones críticas — _hecho: `logTenantAction` (anular, borrar, roles, módulos, borrar negocio) + bitácora del panel_
- [ ] Inicios de sesión
- [x] Consulta simple — _hecho: Auditoría en `/admin/auditoria` (equipo NEXUS)_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N2 — Historial detallado y filtros de auditoría

#### Funcionalidad

- [ ] Registro en todos los módulos
- [x] Búsqueda y filtros — _hecho: filtros en `/admin/auditoria`_
- [ ] Línea de tiempo por registro
- [ ] Dirección IP, dispositivo y ubicación aproximada
- [ ] Exportar
- [x] Registro de acciones del SuperAdmin — _hecho: bitácora del panel, incluida la suplantación_

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N3 — Trazabilidad transversal entre módulos

#### Funcionalidad

- [ ] Bitácora inmutable
- [ ] Registro de lecturas sensibles
- [ ] Eventos de seguridad
- [ ] Registro de las acciones de la IA y las automatizaciones
- [ ] Retención configurable
- [ ] Alertas sobre eventos críticos
- [ ] Vista para auditor o revisor fiscal
- [ ] Soporte de solicitudes de titulares

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N4 — Alertas y conservación automatizada de registros

#### Funcionalidad

- [ ] Cumplimiento y certificaciones
- [ ] Envío a sistemas de seguridad (SIEM)
- [ ] Verificación de integridad
- [ ] Detección de comportamiento interno sospechoso
- [ ] Informes de cumplimiento automáticos
- [ ] Gestión de incidentes
- [ ] Auditoría por negocio y de plataforma
- [ ] Legal hold

#### Técnico

- [ ] Definir arquitectura técnica y modelo de datos de este nivel
- [ ] Definir APIs/acciones, permisos y reglas de negocio

## N5 — Detección de patrones anómalos en la actividad

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).


## N6 — Auditoría empresarial, integridad y evidencia verificable

> Nivel de escalera — contenido por desarrollar (la fuente no lo desglosa).

