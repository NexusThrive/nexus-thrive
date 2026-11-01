import { describe, expect, test } from "vitest";
import { plainDecimal } from "./master-pack";
import { samplePack } from "./__fixtures__/sample-pack";
import {
  buildMasterPackPlan,
  categoryForSection,
  codeSortKey,
  itemSourceKey,
  percentToFraction,
} from "./master-pack-plan";

describe("master-pack-plan — helpers", () => {
  test("percentToFraction es exacto", () => {
    expect(percentToFraction("10")).toBe("0.1");
    expect(percentToFraction("2.5")).toBe("0.025");
    expect(percentToFraction("12.5")).toBe("0.125");
    expect(percentToFraction("0.4")).toBe("0.004");
    expect(percentToFraction("100")).toBe("1");
  });

  test("plainDecimal evita la notación científica", () => {
    expect(plainDecimal(1e-7)).toBe("0.0000001");
    expect(plainDecimal(2.5e-8)).toBe("0.000000025");
    expect(plainDecimal(15731.82)).toBe("15731.82");
    expect(plainDecimal(1e21)).toBe("1000000000000000000000");
  });

  test("itemSourceKey ignora mayúsculas y espacios repetidos, no la unidad", () => {
    expect(itemSourceKey(" Cemento  gris ", "kg")).toBe(itemSourceKey("CEMENTO GRIS", "KG"));
    expect(itemSourceKey("Cemento gris", "kg")).not.toBe(itemSourceKey("Cemento gris", "bulto"));
  });

  test("codeSortKey ordena como el archivo", () => {
    const codes = ["1.10", "1.02", "22.63.01", "2.01", "1.9"];
    const sorted = [...codes].sort((a, b) => codeSortKey(a)!.localeCompare(codeSortKey(b)!));
    expect(sorted).toEqual(["1.02", "1.9", "1.10", "2.01", "22.63.01"]);
  });

  test("categoryForSection cubre todas las secciones del pack", () => {
    expect(categoryForSection("MATERIALES:")).toBe("MATERIAL");
    expect(categoryForSection("MANO de OBRA:")).toBe("MANO_DE_OBRA");
    expect(categoryForSection("EQUIPO y HERRAMIENTAS:")).toBe("EQUIPO");
    expect(categoryForSection("TRANSPORTES:")).toBe("TRANSPORTE");
    expect(categoryForSection("OTROS:")).toBe("OTRO");
    expect(categoryForSection("SUBCONTRATOS:")).toBe("SUBCONTRATO");
    expect(categoryForSection("SEGURIDAD SOCIAL:")).toBe("MANO_DE_OBRA");
    expect(categoryForSection("PRESTACIONES SOCIALES:")).toBe("MANO_DE_OBRA");
    expect(categoryForSection("ELEMENTOS DE PROTECCIÓN PERSONAL (EPP):")).toBe("MANO_DE_OBRA");
    expect(categoryForSection(null)).toBe("OTRO");
  });
});

describe("master-pack-plan — buildMasterPackPlan", () => {
  const plan = buildMasterPackPlan(samplePack());

  test("conserva cada línea tal como el archivo y calcula el consumo porcentual", () => {
    const activity = plan.activities.find((a) => a.code === "1.01")!;
    expect(activity.lines.map((l) => l.section)).toEqual([
      "MATERIALES:",
      "MANO de OBRA:",
      "EQUIPO y HERRAMIENTAS:",
    ]);
    const percent = activity.lines[2];
    expect(percent.lineQuantity).toBe("10");
    expect(percent.consumption).toBe("0.1");
    expect(percent.lineUnitPrice).toBe("14641.31");
  });

  test("verifica el costo contra el archivo", () => {
    expect(plan.mismatches).toEqual([]);
    expect(plan.activities.find((a) => a.code === "1.01")!.computedUnitCost).toBe("17105.44");
  });

  test("detecta un APU cuyo total no cuadra", () => {
    const broken = samplePack();
    broken.apus[0].totalCost = "99999";
    expect(buildMasterPackPlan(broken).mismatches.map((m) => m.sourceKey)).toEqual(["APU:1.01"]);
  });

  test("enlaza el insumo con su APU auxiliar y guarda los totales extra", () => {
    const cuadrilla = plan.items.find((i) => i.name === "CUADRILLA 2 Ay")!;
    expect(cuadrilla.auxiliarySourceKey).toBe("AUX:CUADRILLA 2 AY|DÍA");
    const aux = plan.activities.find((a) => a.isAuxiliary)!;
    expect(aux.extras).toEqual([{ label: "TOTAL % P", value: "0.88" }]);
  });

  test("insumos: MATERIALES da precio y foto; porcentuales con precio 0", () => {
    const cement = plan.items.find((i) => i.name === "CEMENTO GRIS")!;
    expect(cement).toMatchObject({ category: "MATERIAL", unitPrice: "500", imageSha256: "a".repeat(64) });
    const tool = plan.items.find((i) => i.name === "HERRAMIENTA MENOR %")!;
    expect(tool).toMatchObject({ isPercent: true, unitPrice: "0", category: "EQUIPO" });
  });
});
