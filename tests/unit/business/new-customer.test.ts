import { describe, expect, it } from "vitest";
import { EMPTY_NEW_CUSTOMER, cleanDocument, initials, phoneDigits, validateNewCustomer } from "@/lib/business/customers/new-customer";

const input = (extra: Partial<typeof EMPTY_NEW_CUSTOMER> = {}) => ({ ...EMPTY_NEW_CUSTOMER, name: "María Pérez", ...extra });

describe("alta completa de cliente", () => {
  it("solo el nombre es obligatorio", () => {
    expect(validateNewCustomer(input())).toEqual({});
    expect(validateNewCustomer(input({ name: " " })).name).toBe("Escribe el nombre del cliente");
  });
  it("valida el teléfono de 10 dígitos y el correo si se escriben", () => {
    expect(validateNewCustomer(input({ phone: "300 123 45" })).phone).toBeTruthy();
    expect(validateNewCustomer(input({ phone: "300 123 4567" })).phone).toBeUndefined();
    expect(validateNewCustomer(input({ email: "maria@" })).email).toBeTruthy();
    expect(validateNewCustomer(input({ invoiceEmail: "x" })).invoiceEmail).toBeTruthy();
  });
  it("normaliza teléfono, documento e iniciales", () => {
    expect(phoneDigits("+57 300 123 4567")).toBe("3001234567");
    expect(cleanDocument("1.020.345-678")).toBe("1020345678");
    expect(initials("María Pérez Gómez")).toBe("MG");
    expect(initials("Gym")).toBe("G");
    expect(initials("")).toBe("");
  });
});
