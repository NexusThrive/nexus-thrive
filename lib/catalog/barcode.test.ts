import { describe, expect, test } from "vitest";
import { checkBarcode, detectSymbology, gs1CheckDigit, isValidGtin } from "./barcode";

describe("códigos de barras (GS1)", () => {
  test("dígito verificador de códigos reales", () => {
    expect(gs1CheckDigit("400638133393")).toBe(1); // EAN-13 4006381333931
    expect(gs1CheckDigit("03600029145")).toBe(2); // UPC-A 036000291452
    expect(gs1CheckDigit("9638507")).toBe(4); // EAN-8 96385074
  });
  test.each(["4006381333931", "7702004003508", "96385074", "036000291452"])("%s es válido", (code) => expect(isValidGtin(code)).toBe(true));
  test.each(["4006381333932", "7702004003509", "96385075", "12345", "ABC123456789X", ""])("%s no es válido", (code) => expect(isValidGtin(code)).toBe(false));
  test("detecta la simbología por longitud", () => {
    expect(detectSymbology("4006381333931")).toBe("EAN13");
    expect(detectSymbology("036000291452")).toBe("UPCA");
    expect(detectSymbology("96385074")).toBe("EAN8");
    expect(detectSymbology("SKU-001")).toBe("CODE128");
  });
  test("checkBarcode limpia lo que mete el lector y exige el dígito verificador solo a los GTIN", () => {
    expect(checkBarcode(" 4006381333931\n")).toEqual({ ok: true, code: "4006381333931", symbology: "EAN13" });
    expect(checkBarcode("4006381333930")).toMatchObject({ ok: false });
    expect(checkBarcode("INT-00045")).toEqual({ ok: true, code: "INT-00045", symbology: "CODE128" });
    expect(checkBarcode("ab")).toMatchObject({ ok: false });
    expect(checkBarcode("hola mundo!")).toMatchObject({ ok: false });
  });
});
