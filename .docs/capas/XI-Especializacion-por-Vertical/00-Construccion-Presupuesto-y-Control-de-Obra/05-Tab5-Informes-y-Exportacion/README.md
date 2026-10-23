---
id: XI.00.T5
capa_padre: XI.00
tab: 5
titulo: "Tab 5 · Informes & Exportación"
type: tab
capas: "IX · XI · XII"
created: 2026-10-10
updated: 2026-10-23
tags: [capas, construccion, tab, informes, export, bom]
---

# Tab 5 — Informes & Exportación

> Motor de documentos e insumos: del dato vivo al entregable A4/CSV.

## Capas de este tab

| Capa | Nombre | Estado |
| --- | --- | --- |
| **IX** | Informe Cero (línea base) | ✅ N1 implementado (ver README de XI.00) |
| **XI** | Informe Semanal / control | ✅ N1 implementado (ver README de XI.00) |
| **XII** | Explosión BOM & exportación | ✅ N1 implementado (explosión de materiales con exportación CSV en Informes) |

## Baseline N1 (a detallar en los briefs)

- **Informe Cero (línea base):** A4 automático con contrato, alcance y presupuesto congelado.
- **Informe Semanal:** avance %, PPC, bitácora del periodo y registro fotográfico.
- **Explosión BOM & PDF:** lista de compras en CSV + propuesta A4 limpia para el cliente.

## Reutiliza

- Motor documental **VI.03** (plantillas, versiones, firma).
- Plantillas reales del arquitecto (`~/Documents/JuanCarlos/FORMATOS`): InformeCero, InformeSemanal, BitácoraDeObra, PlanDeHitosLookahead.

## Entidades previstas

`ReportTemplate` · `ReportSection` · `GeneratedReport` · `PhotoRegistry` · `Signature`.
