/**
 * REGRESIÓN — formato de dinero y fechas.
 *
 * Estos tests existen por un bug concreto: `formatMoney` aplicaba `Math.abs`,
 * así que un saldo, un neto o un balance NEGATIVO se mostraban positivos.
 * Además la moneda y el locale venían hardcodeados a es-CO/COP, ignorando la
 * org. Si alguien vuelve a meter un `Math.abs` o una constante de moneda,
 * estos tests lo hacen sonar.
 */
import { describe, expect, it } from "vitest";
import { crearFormatos, PRESENTACION_POR_DEFECTO } from "@/lib/shared/format";

const co = crearFormatos(PRESENTACION_POR_DEFECTO);

describe("formatMoney", () => {
  it("CONSERVA el signo de un valor negativo (regresión del Math.abs)", () => {
    const salida = co.formatMoney(-500_000);
    expect(salida.startsWith("-")).toBe(true);
    expect(salida).not.toBe(co.formatMoney(500_000));
  });

  it("el cero no inventa signo", () => {
    expect(co.formatMoney(0).startsWith("-")).toBe(false);
  });

  it("usa la moneda y el país de la organización", () => {
    const us = crearFormatos({ moneda: "USD", pais: "US" });
    // es-CO separa miles con punto; en-US con coma y muestra centavos.
    // Se comparan con patrón y no con cadena exacta: el separador que Intl
    // pone entre el símbolo y la cifra es un espacio duro que cambia entre
    // versiones de ICU.
    expect(co.formatMoney(1_234)).toMatch(/1\.234/);
    expect(us.formatMoney(1_234)).toMatch(/1,234\.00/);
    expect(us.formatMoney(1_234)).not.toBe(co.formatMoney(1_234));
  });

  it("una moneda desconocida no rompe: cae en COP", () => {
    const raro = crearFormatos({ moneda: "", pais: null });
    expect(raro.formatMoney(1_000)).toBe(co.formatMoney(1_000));
  });
});

describe("formatCompact", () => {
  it("abrevia millones y mantiene el signo", () => {
    expect(co.formatCompact(1_500_000)).toMatch(/1,5\s*M/);
    expect(co.formatCompact(-1_500_000)).toMatch(/^-/);
  });

  it("abrevia miles", () => {
    expect(co.formatCompact(8_000)).toMatch(/8\s*K/);
  });
});

describe("formatDate", () => {
  it("un string YYYY-MM-DD se interpreta como fecha local (sin hydration mismatch)", () => {
    // 2026-01-01 en cualquier zona horaria debe ser 1 ene, no 31 dic.
    expect(co.formatDate("2026-01-01")).toMatch(/^1.*ene.*2026$/);
  });

  it("un string con hora se recorta al día", () => {
    expect(co.formatDate("2026-01-01T23:30:00.000Z")).toMatch(/^1.*ene.*2026$/);
  });
});
