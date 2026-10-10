---
id: XI.00
capa: "XI — ESPECIALIZACIÓN POR VERTICAL"
titulo: "Construcción: presupuesto y control de obra"
type: subcapa
contenedor: "/quotes/projects/[projectId]"
tabs: 5
capas_dominio: 14
escalera: "N0 · N1 · N2 · N3 · N4"
rama: "feature/construction-apu-engine"
created: 2026-10-08
updated: 2026-10-10
tags: [capas, estructura, subcapa, construccion, apu]
---

# XI.00 — Construcción: presupuesto y control de obra

> Vertical de construcción. El dominio **no vive como módulo suelto**: vive dentro de un **contenedor de proyecto** (`/quotes/projects/[projectId]`) que se despliega en **5 tabs (workspaces)**. Cada tab agrupa **capas del dominio de construcción**.

- Contenedor técnico: [`00-CONTAINER.md`](00-CONTAINER.md)
- Plantilla de cada capa: [`_BRIEF-TEMPLATE.md`](_BRIEF-TEMPLATE.md)

---

## Modelo de madurez N0–N4

Los niveles representan **madurez funcional**, no etapas cronológicas de la obra.

| Nivel | Nombre | Qué significa |
| --- | --- | --- |
| **N0** | Fundamento | Definición de reglas, conceptos y relaciones indispensables. |
| **N1** | **Operación básica (V1 / BETA)** | El flujo esencial funciona de punta a punta, **sin datos mock**. Es el primer entregable. |
| **N2** | Gestión integral | Vinculación documental y de equipos. |
| **N3** | Control avanzado | Indicadores de desviación y alertas. |
| **N4** | Optimización estratégica | Previsión y decisiones de cartera. |

> **Regla de oro:** no se implementa N2–N4 de forma indiscriminada si N0–N1 no están coherentes y comprobados. N1 = baseline operativo, sin representación visual vacía.

---

## Principio transversal: maestro · contextual · histórico

Todo el vertical separa tres capas de información y **no las mezcla**:

1. **Maestro** — el tercero del CRM (`Customer`). La fuente de verdad del cliente.
2. **Contextual** — la relación del tercero **en una operación** (cotización/proyecto): roles, contactos, ubicación, interventoría.
3. **Histórico** — lo que quedó congelado en un **documento formal** (Informe Cero, propuesta, acta) en el momento de emitirse.

Reglas derivadas:
- **No duplicar** entidades del CRM para representar información de una obra.
- Un cambio posterior en el maestro **no** altera silenciosamente un documento histórico.
- Un dato contextual de obra **no** sobrescribe la dirección fiscal del tercero.

---

## Las 5 tabs (contenedor de obra)

```
/quotes/projects/[projectId]              ← contenedor de obra (1 proyecto = 1 obra)
│
├── Tab 1 · Ficha, Cliente & Encabezado   → capas I · II · IV · XIII
├── Tab 2 · Presupuestador APU & AIU      → capa III
├── Tab 3 · Planificador Lean             → capa V
├── Tab 4 · Bitácora & Campo              → capas VII · VIII
└── Tab 5 · Informes & Exportación        → capas IX · XI · XII
                                          (+ VI · X · XIV sin ubicar)
```

## Las 14 capas del dominio

| Capa | Nombre | Tab | Documento |
| --- | --- | --- | --- |
| I | Cliente & Receptor | 1 | [I-Cliente-y-Receptor.md](01-Tab1-Ficha-y-Cliente/I-Cliente-y-Receptor.md) |
| II | _por definir_ (inferido: Ubicación/Sitio) | 1 | — |
| III | Presupuesto, APU & AIU | 2 | — |
| IV | _por definir_ (inferido: Roles de obra / Equipo) | 1 | — |
| V | Planificación Lean | 3 | — |
| VI | _sin ubicar_ | — | — |
| VII | Bitácora / Diario de campo | 4 | — |
| VIII | Evidencia fotográfica de campo | 4 | — |
| IX | Informe Cero (línea base) | 5 | — |
| X | _sin ubicar_ | — | — |
| XI | Informe Semanal / control | 5 | — |
| XII | Explosión BOM & exportación | 5 | — |
| XIII | Datos de la Constructora (emisor) | 1 | — |
| XIV | _sin ubicar_ | — | — |

> Las capas marcadas **_(inferido)_** y las **sin ubicar (VI · X · XIV)** están pendientes de confirmar con el arquitecto.

## Estructura del árbol de docs

```
00-Construccion-Presupuesto-y-Control-de-Obra/
├── README.md                  ← este archivo (índice)
├── _BRIEF-TEMPLATE.md         ← plantilla de las 14 secciones
├── 00-CONTAINER.md            ← /quotes/projects/[projectId]
├── 01-Tab1-Ficha-y-Cliente/   ← capas I · II · IV · XIII
├── 02-Tab2-Presupuestador/    ← capa III
├── 03-Tab3-Planificador-Lean/ ← capa V
├── 04-Tab4-Bitacora-y-Campo/  ← capas VII · VIII
└── 05-Tab5-Informes-y-Exportacion/ ← capas IX · XI · XII
```

## Estado actual (lo ya construido que se reubica)

Lo que hoy existe en `app/[tenant]/(app)/quotes` y en Prisma (`Quote`, `QuoteItem`, `ApuItem`, `ApuActivity`, `ApuActivityComposition`) se reubica así:

- **Capa III (Tab 2)** — presupuesto por capítulos, APU básico, AIU, importar/exportar, biblioteca de APU, análisis de insumos.
- **Capa I (Tab 1)** — aún no implementada; el CRM `Customer` es el punto de partida.

Las capacidades pendientes (cronograma, bitácora, informes, imágenes, versiones, EVM) corresponden a las capas V, VII, VIII, IX, XI, XII.

---

_Fuente: `DesordenadoCapas.md` (capa `Construccion`) + brief de arquitectura (14 capas · 5 tabs · N0–N4)._
