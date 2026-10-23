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

## Progreso

<!-- progreso:inicio -->
| Capa | Nombre | Nivel N1 (lo básico) | Todas las funcionalidades | |
| --- | --- | --- | --- | --- |
| I | [FUNDACIÓN, NÚCLEO E INFRAESTRUCTURA](I-Fundacion-Nucleo-e-Infraestructura/README.md) | 16/34 · 47 % | 19/138 · 14 % | `█░░░░░░░░░` |
| II | [VISIBILIDAD, CAPTACIÓN Y PRESENCIA DIGITAL](II-Visibilidad-Captacion-y-Presencia-Digital/README.md) | 3/26 · 12 % | 4/169 · 2 % | `░░░░░░░░░░` |
| III | [ATENCIÓN Y COMUNICACIÓN](III-Atencion-y-Comunicacion/README.md) | 1/9 · 11 % | 1/78 · 1 % | `░░░░░░░░░░` |
| IV | [GESTIÓN COMERCIAL Y RELACIÓN CON CLIENTES](IV-Gestion-Comercial-y-Relacion-con-Clientes/README.md) | 4/14 · 29 % | 4/92 · 4 % | `░░░░░░░░░░` |
| V | [VENTAS DIGITALES, COMERCIO Y PAGOS](V-Ventas-Digitales-Comercio-y-Pagos/README.md) | 5/24 · 21 % | 8/162 · 5 % | `░░░░░░░░░░` |
| VI | [OPERACIÓN, PRODUCTIVIDAD Y LOGÍSTICA](VI-Operacion-Productividad-y-Logistica/README.md) | 7/36 · 19 % | 7/247 · 3 % | `░░░░░░░░░░` |
| VII | [CAJA MENOR, FINANZAS OPERATIVAS Y CONTABILIDAD](VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/README.md) | 9/31 · 29 % | 13/195 · 7 % | `█░░░░░░░░░` |
| VIII | [TALENTO HUMANO Y ADMINISTRACIÓN DEL EQUIPO](VIII-Talento-Humano-y-Administracion-del-Equipo/README.md) | 0/23 · 0 % | 0/173 · 0 % | `░░░░░░░░░░` |
| IX | [INTELIGENCIA DE NEGOCIO, ANALÍTICA E IA](IX-Inteligencia-de-Negocio-Analitica-e-IA/README.md) | 8/26 · 31 % | 8/127 · 6 % | `█░░░░░░░░░` |
| X | [PLATAFORMA SAAS, GOBERNANZA Y ESCALABILIDAD](X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/README.md) | 7/18 · 39 % | 12/127 · 9 % | `█░░░░░░░░░` |
| XI | [ESPECIALIZACIÓN POR VERTICAL](XI-Especializacion-por-Vertical/README.md) | 0/0 · — | 0/0 · — | `` |
| | **Total** | **60/241 · 25 %** | **76/1508 · 5 %** | |

_Generado con `node scripts/capas-progreso.mjs --write`. La capa XI (construcción) usa pestañas en lugar de casillas: su estado está en su README._
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