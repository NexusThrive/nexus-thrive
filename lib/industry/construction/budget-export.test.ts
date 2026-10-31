import { describe, expect, test } from "vitest";
import * as XLSX from "xlsx";
import { buildBudgetWorkbook } from "./budget-export";
import type { ProjectBudgetData } from "./shared";

const budget = {
  id: "b",
  projectId: "p",
  code: "PRES-2026-007",
  name: "Presupuesto",
  aiuAdminPct: "100000",
  aiuImprevPct: "50000",
  aiuUtilidadPct: "50000",
  ivaUtilidadPct: "190000",
  directCostTotal: "1000000000000",
  adminTotal: "100000000000",
  imprevTotal: "50000000000",
  utilidadTotal: "50000000000",
  ivaUtilidadTotal: "9500000000",
  grandTotal: "1209500000000",
  isLocked: false,
  revision: 3,
  chapters: [
    {
      id: "c1",
      order: 1,
      name: "Cimentación",
      description: null,
      subtotal: "1000000000000",
      items: [
        {
          id: "i1",
          order: 1,
          code: "1.1",
          description: "Zapata",
          unit: "m3",
          quantity: "12500000",
          unitCostDirect: "80000000000",
          totalCostDirect: "1000000000000",
          resources: [
            {
              id: "r1",
              type: "MATERIAL",
              name: "Concreto",
              unit: "m3",
              performance: "1050000",
              unitPrice: "70000000000",
              totalPrice: "73500000000",
              imageUrl: null,
              imageId: null,
              section: "MATERIALES:",
              order: 0,
              wastePct: "50000",
            },
          ],
        },
      ],
    },
  ],
} as unknown as ProjectBudgetData;

describe("buildBudgetWorkbook", () => {
  const workbook = XLSX.read(
    buildBudgetWorkbook({
      budget,
      projectCode: "OBR-1",
      projectName: "Casa",
      customerName: "Cliente S.A.S.",
      issuerName: "Constructora",
      generatedOn: "2026-10-16",
    }),
    { type: "array" },
  );

  test("hoja Presupuesto con partidas y cierre AIU en pesos", () => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Presupuesto, { header: 1 });
    expect(rows.find((r) => r[0] === "1.1")).toEqual(["1.1", "Zapata", "m3", 12.5, 80000, 1000000]);
    expect(rows.find((r) => r[1] === "TOTAL")?.[5]).toBe(1209500);
    expect(rows.find((r) => String(r[1]).startsWith("Administración"))?.[1]).toBe("Administración (10 %)");
  });

  test("hoja APU con sección, rendimiento y desperdicio de cada recurso", () => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.APU, { header: 1 });
    expect(rows.find((r) => r[1] === "Concreto")).toEqual([
      undefined,
      "Concreto",
      "MATERIALES",
      "m3",
      1.05,
      5,
      70000,
      73500,
    ]);
  });
});
