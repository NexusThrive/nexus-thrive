import { describe, expect, test } from "vitest";
import { exactIlikePattern, normalizeEmail, verifiedEmailOf } from "./session-email";

const verified = { status: "verified" };
const unverified = { status: "unverified" };

describe("verifiedEmailOf", () => {
  test("devuelve el principal verificado, normalizado", () => {
    expect(
      verifiedEmailOf({ primaryEmailAddress: { emailAddress: "  Ana@Ejemplo.COM ", verification: verified } }),
    ).toBe("ana@ejemplo.com");
  });

  test("un principal sin verificar no sirve", () => {
    expect(verifiedEmailOf({ primaryEmailAddress: { emailAddress: "ana@ejemplo.com", verification: unverified } })).toBeNull();
    expect(verifiedEmailOf({ primaryEmailAddress: { emailAddress: "ana@ejemplo.com", verification: null } })).toBeNull();
  });

  test("no cae en el primero de la lista si no es el principal", () => {
    expect(
      verifiedEmailOf({
        primaryEmailAddressId: "e2",
        emailAddresses: [
          { id: "e1", emailAddress: "otro@ejemplo.com", verification: verified },
          { id: "e2", emailAddress: "ana@ejemplo.com", verification: unverified },
        ],
      }),
    ).toBeNull();
  });

  test("encuentra el principal por id cuando no viene resuelto", () => {
    expect(
      verifiedEmailOf({
        primaryEmailAddressId: "e2",
        emailAddresses: [
          { id: "e1", emailAddress: "otro@ejemplo.com", verification: unverified },
          { id: "e2", emailAddress: "ana@ejemplo.com", verification: verified },
        ],
      }),
    ).toBe("ana@ejemplo.com");
  });

  test("sin usuario o sin correo, null", () => {
    expect(verifiedEmailOf(null)).toBeNull();
    expect(verifiedEmailOf({})).toBeNull();
    expect(verifiedEmailOf({ primaryEmailAddress: { emailAddress: "  ", verification: verified } })).toBeNull();
  });
});

describe("exactIlikePattern", () => {
  test("escapa los comodines de ILIKE", () => {
    expect(exactIlikePattern("ana_perez@ejemplo.com")).toBe("ana\\_perez@ejemplo.com");
    expect(exactIlikePattern("%@ejemplo.com")).toBe("\\%@ejemplo.com");
    expect(exactIlikePattern("a\\b")).toBe("a\\\\b");
  });

  test("un correo normal queda igual", () => {
    expect(exactIlikePattern("ana.perez@ejemplo.com")).toBe("ana.perez@ejemplo.com");
  });
});

test("normalizeEmail recorta y pasa a minúsculas", () => {
  expect(normalizeEmail(" Ana@Ejemplo.com ")).toBe("ana@ejemplo.com");
  expect(normalizeEmail(null)).toBe("");
});
