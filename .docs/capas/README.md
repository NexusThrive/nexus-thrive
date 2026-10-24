---
id: capas
titulo: "Estructura de Capas del Negocio"
type: indice
created: 2026-10-08
updated: 2026-10-23
tags: [capas, estructura, indice]
---

# Estructura de Capas del Negocio

Árbol de capacidades de la plataforma. Cada carpeta `N-Capa` contiene sus subcapas; cada subcapa es una escalera de madurez N0–N6 (N1–N4 con contenido del `DesordenadoCapas.md`; N0/N5/N6 por desarrollar).

> Entrada general de la guía (visión, objetivos y ruta): [`../README.md`](../README.md).
>
> Casillas: `- [x]` hecho en el producto (con la nota _hecho: dónde_), `- [ ]`
> pendiente. Lo marcado _(objetivo 2026)_ son los objetivos nuevos.

> **Todo tiene API, MCP y webhooks.** Cada subcapa trae, antes de su escalera,
> una sección **🔌 Superficie de integración** (recursos REST, eventos,
> herramientas MCP y sistemas externos) con sus propias casillas. Esas casillas
> se cuentan aparte (columna *Integración*) y no mueven el porcentaje de
> funcionalidades. Reglas: [`../integracion-api-mcp-webhooks.md`](../integracion-api-mcp-webhooks.md).

## Progreso

<!-- progreso:inicio -->
| Capa | Nombre | Nivel N1 (lo básico) | Todas las funcionalidades | Integración (API · MCP · Webhooks) | |
| --- | --- | --- | --- | --- | --- |
| I | [FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA](I-Fundacion-Nucleo-e-Infraestructura/README.md) | 26/34 · 76 % | 30/138 · 22 % | 0/47 · 0 % | `██░░░░░░░░` |
| II | [VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL](II-Visibilidad-Captacion-y-Presencia-Digital/README.md) | 7/26 · 27 % | 8/170 · 5 % | 0/42 · 0 % | `░░░░░░░░░░` |
| III | [ATENCIÓN Y COMUNICACIÓN](III-Atencion-y-Comunicacion/README.md) | 1/9 · 11 % | 1/78 · 1 % | 0/30 · 0 % | `░░░░░░░░░░` |
| IV | [GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES](IV-Gestion-Comercial-y-Relacion-con-Clientes/README.md) | 5/14 · 36 % | 5/92 · 5 % | 0/30 · 0 % | `█░░░░░░░░░` |
| V | [VENTAS DIGITALES, COMERCIO Y PAGOS](V-Ventas-Digitales-Comercio-y-Pagos/README.md) | 9/24 · 38 % | 21/162 · 13 % | 0/48 · 0 % | `█░░░░░░░░░` |
| VI | [OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA](VI-Operacion-Productividad-y-Logistica/README.md) | 12/36 · 33 % | 14/247 · 6 % | 0/54 · 0 % | `█░░░░░░░░░` |
| VII | [CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD](VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/README.md) | 19/31 · 61 % | 28/195 · 14 % | 0/48 · 0 % | `█░░░░░░░░░` |
| VIII | [TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO](VIII-Talento-Humano-y-Administracion-del-Equipo/README.md) | 0/23 · 0 % | 0/173 · 0 % | 0/48 · 0 % | `░░░░░░░░░░` |
| IX | [INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA](IX-Inteligencia-de-Negocio-Analitica-e-IA/README.md) | 9/26 · 35 % | 9/128 · 7 % | 0/35 · 0 % | `█░░░░░░░░░` |
| X | [PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD](X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/README.md) | 11/18 · 61 % | 20/127 · 16 % | 0/30 · 0 % | `██░░░░░░░░` |
| XI | [ESPECIALIZACIÓN POR VERTICAL](XI-Especializacion-por-Vertical/README.md) | 0/0 · — | 0/0 · — | 0/6 · 0 % | `` |
| | **Total** | **99/241 · 41 %** | **136/1510 · 9 %** | **0/418 · 0 %** | |

_Generado con `node scripts/capas-progreso.mjs --write`. La capa XI (construcción) usa pestañas en lugar de casillas: su estado está en su README. «Integración» cuenta las casillas de la superficie API · MCP · Webhooks de cada subcapa (no suman al porcentaje de funcionalidades)._
<!-- progreso:fin -->

## Capas

- [I. FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA](I-Fundacion-Nucleo-e-Infraestructura/README.md) — 8 subcapas
- [II. VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL](II-Visibilidad-Captacion-y-Presencia-Digital/README.md) — 7 subcapas
- [III. ATENCIÓN Y COMUNICACIÓN](III-Atencion-y-Comunicacion/README.md) — 5 subcapas
- [IV. GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES](IV-Gestion-Comercial-y-Relacion-con-Clientes/README.md) — 5 subcapas
- [V. VENTAS DIGITALES, COMERCIO Y PAGOS](V-Ventas-Digitales-Comercio-y-Pagos/README.md) — 8 subcapas
- [VI. OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA](VI-Operacion-Productividad-y-Logistica/README.md) — 9 subcapas
- [VII. CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD](VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/README.md) — 8 subcapas
- [VIII. TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO](VIII-Talento-Humano-y-Administracion-del-Equipo/README.md) — 8 subcapas
- [IX. INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA](IX-Inteligencia-de-Negocio-Analitica-e-IA/README.md) — 6 subcapas
- [X. PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD](X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/README.md) — 5 subcapas
- [XI. ESPECIALIZACIÓN POR VERTICAL](XI-Especializacion-por-Vertical/README.md) — 1 subcapas

## Fuente

- [`../fuentes/DesordenadoCapas.md`](../fuentes/DesordenadoCapas.md) — contenido fuente (niveles N1–N4).
- [`../fuentes/EstructuraCapasImplementacion.md`](../fuentes/EstructuraCapasImplementacion.md) — nombres de capas, subcapas y escalera N0–N6.