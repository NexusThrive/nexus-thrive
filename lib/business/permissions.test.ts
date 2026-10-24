import { describe, expect, test } from "vitest";
import { BUSINESS_PERMISSIONS, can, type BusinessPermission } from "./permissions";
import { canHandleCash, canManage, canManageTeam, type BusinessRole } from "./roles";

/**
 * La matriz rol × permiso, escrita a mano. Si cambias un permiso en
 * `permissions.ts`, esta tabla tiene que cambiar contigo: así ningún acceso se
 * amplía sin querer (SEC-05).
 */
const ROLES: BusinessRole[] = ["SUPERADMIN", "OWNER", "ADMIN", "RECEPTION", "ADVISOR", "STAFF"];

//                                  SUPER  OWNER  ADMIN  RECEP  ADVIS  STAFF
const EXPECTED: Record<BusinessPermission, boolean[]> = {
  "business.manage":       [true,  true,  true,  false, false, false],
  "team.manage":           [true,  true,  true,  false, false, false],
  "business.setup":        [true,  true,  false, false, false, false],
  "money.handle":          [true,  true,  true,  true,  false, true ],
  "data.exchange":         [true,  true,  true,  false, false, false],
  "customers.delete":      [true,  true,  true,  false, false, false],
  "budget.govern":         [true,  true,  true,  false, false, false],
  "budget.edit":           [true,  true,  true,  false, false, true ],
  "apu.edit":              [true,  true,  true,  false, false, true ],
  "apu.destroy":           [true,  true,  true,  false, false, false],
  "projects.create":       [true,  true,  false, false, false, false],
  "projects.changeStatus": [true,  true,  true,  false, false, false],
  "projects.editContent":  [true,  true,  true,  false, true,  true ],
  "projects.editHeader":   [true,  true,  true,  false, false, true ],
  "fieldLog.create":       [true,  true,  true,  true,  true,  true ],
  "fieldLog.delete":       [true,  true,  false, false, false, false],
  "lean.plan":             [true,  true,  true,  false, false, true ],
};

describe("matriz de permisos del negocio", () => {
  test("cada permiso de la matriz está en la tabla esperada", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(Object.keys(BUSINESS_PERMISSIONS).sort());
  });

  for (const [permission, row] of Object.entries(EXPECTED) as [BusinessPermission, boolean[]][]) {
    test(permission, () => {
      expect(ROLES.map((role) => can(role, permission))).toEqual(row);
    });
  }

  test("el Asesor no maneja dinero ni borra clientes", () => {
    expect(can("ADVISOR", "money.handle")).toBe(false);
    expect(can("ADVISOR", "customers.delete")).toBe(false);
  });

  test("un rol desconocido no tiene ningún permiso", () => {
    for (const permission of Object.keys(BUSINESS_PERMISSIONS) as BusinessPermission[]) {
      expect(can("INVENTADO", permission)).toBe(false);
      expect(can("", permission)).toBe(false);
    }
  });

  test("los atajos de roles.ts siguen la matriz", () => {
    for (const role of ROLES) {
      expect(canManage(role)).toBe(can(role, "business.manage"));
      expect(canHandleCash(role)).toBe(can(role, "money.handle"));
      expect(canManageTeam(role)).toBe(can(role, "team.manage"));
    }
  });
});
