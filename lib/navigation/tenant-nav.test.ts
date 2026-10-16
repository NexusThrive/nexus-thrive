import { describe, expect, it } from "vitest";
import { activeNavItem, buildTenantNav, isNavActive, tenantRelativePath } from "./tenant-nav";
import { quickCreateActions } from "./quick-create";

describe("buildTenantNav", () => {
  it("solo muestra módulos activos y siempre Configuración", () => {
    const groups = buildTenantNav("gym", ["dashboard", "crm"]);
    expect(groups.map((g) => g.label)).toEqual(["General", "Gestión", "Sistema"]);
    expect(groups.flatMap((g) => g.items).map((i) => i.href)).toEqual(["", "/crm", "/settings"]);
  });

  it("cotizaciones en construcción abre Obras, Cotizaciones y Catálogo APU", () => {
    const labels = buildTenantNav("construction", ["quotes"])
      .flatMap((g) => g.items)
      .map((i) => i.label);
    expect(labels).toEqual(["Obras", "Cotizaciones", "Catálogo APU", "Configuración"]);
  });
});

describe("ruta activa", () => {
  it("quita el slug del negocio", () => {
    expect(tenantRelativePath("/acme", "acme")).toBe("/");
    expect(tenantRelativePath("/acme/projects/9", "acme")).toBe("/projects/9");
  });

  it("inicio solo coincide en la raíz; los módulos también en subrutas", () => {
    expect(isNavActive("", "/")).toBe(true);
    expect(isNavActive("", "/crm")).toBe(false);
    expect(isNavActive("/projects", "/projects/9")).toBe(true);
    expect(isNavActive("/project", "/projects")).toBe(false);
  });

  it("encuentra el ítem activo", () => {
    const groups = buildTenantNav("construction", ["dashboard", "quotes"]);
    expect(activeNavItem(groups, "/quotes/4")?.label).toBe("Cotizaciones");
  });
});

describe("quickCreateActions", () => {
  it("depende de los módulos activos y no pasa de cuatro", () => {
    expect(quickCreateActions("gym", ["dashboard"])).toEqual([]);
    const all = quickCreateActions("construction", ["quotes", "crm", "finance", "bookings", "billing"]);
    expect(all).toHaveLength(4);
    expect(all[0].label).toBe("Nueva obra");
  });
});
