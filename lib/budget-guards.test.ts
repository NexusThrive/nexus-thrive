import { describe, expect, test } from "vitest";
import {
  isUnchangedAiu,
  isUnchangedChapter,
  isUnchangedItem,
  microToBigIntExact,
} from "./budget-guards";

describe("microToBigIntExact", () => {
  test("acepta bigint, número entero y string numérico", () => {
    expect(microToBigIntExact(BigInt(1_000_000))).toBe(BigInt(1_000_000));
    expect(microToBigIntExact("20000000000")).toBe(BigInt(20_000_000_000));
    expect(microToBigIntExact(42)).toBe(BigInt(42));
  });

  test("devuelve null ante valores no exactos", () => {
    expect(microToBigIntExact("1.5")).toBeNull();
    expect(microToBigIntExact("")).toBeNull();
    expect(microToBigIntExact(null)).toBeNull();
    expect(microToBigIntExact(undefined)).toBeNull();
    expect(microToBigIntExact("abc")).toBeNull();
  });
});

describe("isUnchangedChapter", () => {
  const chapter = { name: "Preliminares", description: "Obra gris" };

  test("mismos valores → sin cambios", () => {
    expect(
      isUnchangedChapter(chapter, {
        name: "Preliminares",
        description: "Obra gris",
      }),
    ).toBe(true);
  });

  test("nombre distinto → cambia", () => {
    expect(
      isUnchangedChapter(chapter, {
        name: "Preliminares 2",
        description: "Obra gris",
      }),
    ).toBe(false);
  });

  test("descripción distinta → cambia", () => {
    expect(
      isUnchangedChapter(chapter, {
        name: "Preliminares",
        description: "Obra gris y blanca",
      }),
    ).toBe(false);
  });

  test("descripción vacía y null son equivalentes", () => {
    const sinDescripcion = { name: "Preliminares", description: null };
    expect(isUnchangedChapter(sinDescripcion, { name: "Preliminares" })).toBe(
      true,
    );
    expect(
      isUnchangedChapter(sinDescripcion, {
        name: "Preliminares",
        description: null,
      }),
    ).toBe(true);
  });
});

describe("isUnchangedItem", () => {
  const item = {
    code: "1.1",
    description: "Excavación",
    unit: "m3",
    quantity: "1000000",
    unitCostDirect: "20000000000",
  };
  const patch = {
    code: "1.1",
    description: "Excavación",
    unit: "m3",
    quantity: BigInt(1_000_000),
    unitCostDirect: BigInt(20_000_000_000),
  };

  test("mismos valores en micro → sin cambios", () => {
    expect(isUnchangedItem(item, patch)).toBe(true);
  });

  test("cantidad distinta → cambia", () => {
    expect(
      isUnchangedItem(item, { ...patch, quantity: BigInt(2_000_000) }),
    ).toBe(false);
  });

  test("costo unitario distinto → cambia", () => {
    expect(
      isUnchangedItem(item, {
        ...patch,
        unitCostDirect: BigInt(20_000_000_001),
      }),
    ).toBe(false);
  });

  test("unidad o código distintos → cambia", () => {
    expect(isUnchangedItem(item, { ...patch, code: "1.2" })).toBe(false);
    expect(isUnchangedItem(item, { ...patch, unit: "m2" })).toBe(false);
  });

  test("valor no exacto en BD → nunca se considera sin cambios", () => {
    expect(isUnchangedItem({ ...item, quantity: "1.5" }, patch)).toBe(false);
  });
});

describe("isUnchangedAiu", () => {
  // 10 % / 5 % / 5 % / 19 % en micro-fracción.
  const budget = {
    aiuAdminPct: BigInt(100_000),
    aiuImprevPct: BigInt(50_000),
    aiuUtilidadPct: BigInt(50_000),
    ivaUtilidadPct: BigInt(190_000),
  };
  const config = {
    adminPct: BigInt(100_000),
    imprevPct: BigInt(50_000),
    utilidadPct: BigInt(50_000),
    ivaUtilidadPct: BigInt(190_000),
  };

  test("mismos porcentajes → sin cambios", () => {
    expect(isUnchangedAiu(budget, config)).toBe(true);
  });

  test("un solo porcentaje distinto → cambia", () => {
    expect(
      isUnchangedAiu(budget, { ...config, adminPct: BigInt(120_000) }),
    ).toBe(false);
    expect(
      isUnchangedAiu(budget, { ...config, ivaUtilidadPct: BigInt(0) }),
    ).toBe(false);
  });
});
