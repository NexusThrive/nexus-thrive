---
id: XI.00.T2
capa_padre: XI.00
tab: 2
titulo: "Tab 2 · Presupuestador APU & AIU"
type: tab
capas: "III"
created: 2026-10-10
updated: 2026-10-23
tags: [capas, construccion, tab, apu, presupuesto]
---

# Tab 2 — Presupuestador APU & AIU

> Capa **III**: biblioteca APU con fotos, capítulos, cantidades, AIU/IVA y **snapshots inmutables**.

## Capas de este tab

| Capa | Nombre | Estado |
| --- | --- | --- |
| **III** | Presupuesto, APU & AIU | ✅ N1 implementado (ver README de XI.00) |

## Baseline N1 (a detallar en el brief de capa III)

- Biblioteca APU con fotos: insumos (materiales, mano de obra, equipos, transporte) con imágenes.
- Estructura por capítulos e ítems: actividades con rendimientos y cantidades.
- Cálculo de AIU & IVA legal en `BigInt`.
- Snapshots inmutables: fotografía congelada de la receta al aprobar.

## Reutiliza

- Modelos Prisma existentes: `ApuItem`, `ApuActivity`, `ApuActivityComposition`, `Quote`, `QuoteItem` (`apuSnapshot`, `adminPercent`/`imprevPercent`/`utilPercent`/`taxPercent`).
- Módulo `app/[tenant]/(app)/quotes` (builder, items-bank, activity-catalog, explosion, import, print).
