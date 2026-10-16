/**
 * Exportación del presupuesto de obra a Excel (función pura).
 *
 * Hoja "Presupuesto": capítulos, partidas y cierre AIU. Hoja "APU": la
 * composición de cada partida. Los valores van como números (pesos) para
 * que el archivo se pueda seguir trabajando en Excel.
 */
import * as XLSX from "xlsx";
import type { ProjectBudgetData } from "./shared";

const SCALE = 1_000_000;

function num(micro: string): number {
  return Number(BigInt(micro)) / SCALE;
}

function pct(microFraction: string): number {
  // 100_000 = 10 % → 10
  return (Number(BigInt(microFraction)) / SCALE) * 100;
}

export function buildBudgetWorkbook(input: {
  budget: ProjectBudgetData;
  projectCode: string;
  projectName: string;
  customerName: string;
  issuerName: string | null;
  generatedOn: string;
}): Uint8Array {
  const { budget } = input;
  const rows: (string | number | null)[][] = [
    [input.issuerName ?? "", null, null, null, null, null],
    ["PRESUPUESTO DE OBRA", null, null, null, null, null],
    ["Obra", `${input.projectCode} · ${input.projectName}`],
    ["Cliente", input.customerName],
    ["Presupuesto", `${budget.code} (revisión ${budget.revision})`],
    ["Fecha", input.generatedOn],
    [],
    ["Ítem", "Descripción", "Und", "Cantidad", "Vr. unitario", "Vr. total"],
  ];
  for (const chapter of budget.chapters) {
    rows.push([String(chapter.order), chapter.name.toUpperCase(), null, null, null, num(chapter.subtotal)]);
    for (const item of chapter.items) {
      rows.push([
        item.code,
        item.description,
        item.unit,
        num(item.quantity),
        num(item.unitCostDirect),
        num(item.totalCostDirect),
      ]);
    }
  }
  rows.push(
    [],
    [null, "Costo directo", null, null, null, num(budget.directCostTotal)],
    [null, `Administración (${pct(budget.aiuAdminPct)} %)`, null, null, null, num(budget.adminTotal)],
    [null, `Imprevistos (${pct(budget.aiuImprevPct)} %)`, null, null, null, num(budget.imprevTotal)],
    [null, `Utilidad (${pct(budget.aiuUtilidadPct)} %)`, null, null, null, num(budget.utilidadTotal)],
    [null, `IVA sobre utilidad (${pct(budget.ivaUtilidadPct)} %)`, null, null, null, num(budget.ivaUtilidadTotal)],
    [null, "TOTAL", null, null, null, num(budget.grandTotal)],
  );
  const summary = XLSX.utils.aoa_to_sheet(rows);
  summary["!cols"] = [{ wch: 10 }, { wch: 60 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 18 }];

  const apuRows: (string | number | null)[][] = [
    ["Ítem", "Partida / recurso", "Sección", "Und", "Rendimiento", "Desperdicio %", "Precio unitario", "Vr. parcial"],
  ];
  for (const chapter of budget.chapters) {
    for (const item of chapter.items) {
      apuRows.push([item.code, item.description, null, item.unit, null, null, null, num(item.unitCostDirect)]);
      for (const resource of item.resources) {
        apuRows.push([
          null,
          resource.name,
          resource.section?.replace(/:\s*$/, "") ?? resource.type,
          resource.unit,
          num(resource.performance),
          pct(resource.wastePct),
          num(resource.unitPrice),
          num(resource.totalPrice),
        ]);
      }
    }
  }
  const apu = XLSX.utils.aoa_to_sheet(apuRows);
  apu["!cols"] = [{ wch: 10 }, { wch: 55 }, { wch: 22 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summary, "Presupuesto");
  XLSX.utils.book_append_sheet(workbook, apu, "APU");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}
