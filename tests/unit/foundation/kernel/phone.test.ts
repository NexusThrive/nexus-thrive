import { describe, expect, it } from "vitest";
import { canonicalPhone, isIdentifyingPhone, namesCompatible, stageForPaidCount } from "@/lib/foundation/kernel/phone";

describe("teléfonos colombianos (HU-contacto-unico-01)", () => {
  it("todas las formas de escribir el mismo móvil dan el mismo teléfono canónico", () => {
    for (const raw of ["300 111 2233", "3001112233", "+57 300-111-2233", "(57) 3001112233", "573001112233", "0573001112233", "0573 001 112 233", "03001112233", "+573001112233"]) {
      expect(canonicalPhone(raw), raw).toBe("573001112233");
    }
  });
  it("un fijo, un extranjero o un dato vacío no se inventan", () => {
    expect(canonicalPhone("")).toBe("");
    expect(canonicalPhone(null)).toBe("");
    expect(canonicalPhone("605 123 4567")).toBe("6051234567");
    expect(canonicalPhone("+1 415 555 0100")).toBe("14155550100");
    expect(isIdentifyingPhone("573001112233")).toBe(true);
    expect(isIdentifyingPhone("12345")).toBe(false);
  });
  it("el mismo nombre escrito distinto es compatible; otra persona no", () => {
    expect(namesCompatible("Camila Torres", "camila")).toBe(true);
    expect(namesCompatible("Camila Torres", "CAMILA TORRES RÍOS")).toBe(true);
    expect(namesCompatible("María Fernanda Ríos", "Maria F. Rios")).toBe(true);
    expect(namesCompatible("Camila Torres", "Andrés Gómez")).toBe(false);
    expect(namesCompatible("", "Andrés")).toBe(true);
  });
  it("la etapa sube con las compras pagadas", () => {
    expect([0, 1, 2, 3, 9].map(stageForPaidCount)).toEqual(["PROSPECT", "CUSTOMER", "CUSTOMER", "RECURRING", "RECURRING"]);
  });
});
