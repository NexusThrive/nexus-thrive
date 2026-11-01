import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, SYSTEM_ROLES, can, canGrantAll, isPermission, normalizePermissions } from "./permissions";

describe("permisos del Operations Center", () => {
  it("las claves son únicas", () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });
  it("los roles base solo usan claves del catálogo", () => {
    for (const r of SYSTEM_ROLES) expect(r.permissions.every(isPermission)).toBe(true);
  });
  it("el propietario lo tiene todo", () => {
    expect(SYSTEM_ROLES.find((r) => r.key === "owner")?.permissions).toEqual(ALL_PERMISSIONS);
  });
  it("normaliza: quita desconocidas y repetidas, respeta el orden del catálogo", () => {
    expect(normalizePermissions(["audit.view", "x", "leads.view", "leads.view"])).toEqual(["leads.view", "audit.view"]);
  });
  it("can y canGrantAll", () => {
    expect(can(["leads.view"], "leads.view")).toBe(true);
    expect(can(["leads.view"], "billing.refund")).toBe(false);
    expect(canGrantAll(["leads.view", "leads.edit"], ["leads.view"])).toBe(true);
    expect(canGrantAll(["leads.view"], ["billing.refund"])).toBe(false);
  });
});
