import { describe, expect, test } from "vitest";
import { BUSINESS_PERMISSIONS } from "@/lib/core/auth/permissions";
import { accessMessage, joinRoles, rolesThatCan } from "@/lib/core/auth/roles";

describe("mensaje de «sin permiso» derivado de la matriz", () => {
  test("lista los roles que ofrece la interfaz y tienen el permiso", () => {
    expect(rolesThatCan("business.manage")).toEqual(["Dueño", "Administración"]);
    expect(rolesThatCan("money.handle")).toEqual(["Dueño", "Administración", "Recepción"]);
    expect(rolesThatCan("business.setup")).toEqual(["Dueño"]);
  });

  test("une los roles en español", () => {
    expect(joinRoles(["Dueño"])).toBe("Dueño");
    expect(joinRoles(["Dueño", "Administración"])).toBe("Dueño o Administración");
    expect(joinRoles(["Dueño", "Administración", "Recepción"])).toBe("Dueño, Administración o Recepción");
  });

  test("dice qué no puede hacer, quién sí y cómo pedirlo", () => {
    const m = accessMessage("data.exchange", "importar y exportar datos");
    expect(m.title).toBe("No puedes importar y exportar datos.");
    expect(m.detail).toBe("Dueño o Administración pueden hacerlo. Pídeselo a quien administre tu negocio.");
    expect(accessMessage("business.setup", "cambiar el plan").detail).toMatch(/^Dueño puede hacerlo/);
  });

  test("todo permiso tiene al menos un rol ofrecido o cae en el dueño", () => {
    for (const p of Object.keys(BUSINESS_PERMISSIONS) as (keyof typeof BUSINESS_PERMISSIONS)[]) {
      expect(accessMessage(p, "hacer esto").detail.length).toBeGreaterThan(10);
    }
  });
});
