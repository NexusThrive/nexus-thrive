import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODULES, VERTICALS } from "@/lib/admin/catalogs";
import { activeNavItem, buildTenantNav, isNavActive, modulesForRoute, tenantRelativePath } from "./tenant-nav";
import { quickCreateActions } from "./quick-create";

describe("buildTenantNav", () => {
  it("siempre muestra Inicio aunque el módulo de panel no esté activo", () => {
    const groups = buildTenantNav("construction", ["construction"]);
    expect(groups[0].items.map((i) => i.label)).toEqual(["Inicio"]);
  });

  it("solo muestra funciones activas y siempre Funciones y Configuración", () => {
    const groups = buildTenantNav("gym", ["dashboard", "crm"]);
    expect(groups.map((g) => g.label)).toEqual(["General", "Clientes y operación", "Sistema"]);
    expect(groups.flatMap((g) => g.items).map((i) => i.href)).toEqual(["", "/crm", "/functions", "/settings"]);
  });

  it("agrupa por trabajo y omite los grupos vacíos", () => {
    const groups = buildTenantNav("gym", ["dashboard", "crm", "memberships", "finance", "payments", "whatsapp"]);
    expect(groups.map((g) => g.label)).toEqual(["General", "Clientes y operación", "Dinero", "Canales", "Sistema"]);
    // Pagos vive dentro de Finanzas: no se repite.
    expect(groups.find((g) => g.label === "Dinero")?.items.map((i) => i.label)).toEqual(["Finanzas"]);
  });

  it("la suite de construcción abre Obras, Cotizaciones y Catálogo APU", () => {
    const labels = buildTenantNav("construction", ["construction"])
      .flatMap((g) => g.items)
      .map((i) => i.label);
    expect(labels).toEqual(["Inicio", "Obras", "Cotizaciones", "Catálogo APU", "Funciones", "Configuración"]);
  });
});

describe("ARCH-01: construcción separada de cotizaciones", () => {
  it("un rubro que no construye no ve pantallas APU aunque tenga cotizaciones", () => {
    const hrefs = buildTenantNav("mechanic", ["dashboard", "crm", "quotes"]).flatMap((g) => g.items).map((i) => i.href);
    expect(hrefs).not.toContain("/catalog");
    expect(hrefs).not.toContain("/projects");
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
    const groups = buildTenantNav("construction", ["dashboard", "construction"]);
    expect(activeNavItem(groups, "/quotes/4")?.label).toBe("Cotizaciones");
  });
});

describe("quickCreateActions", () => {
  it("depende de los módulos activos y no pasa de cuatro", () => {
    expect(quickCreateActions("gym", ["dashboard"])).toEqual([]);
    const all = quickCreateActions("construction", ["construction", "crm", "finance", "bookings", "billing"]);
    expect(all).toHaveLength(4);
    expect(all[0].label).toBe("Nueva obra");
  });
});

// ARCH-02 (docs/nexus-architecture/technical-debt.md): ningún ítem del menú
// lleva a un 404. Para cada rubro con todos los módulos activos, cada `href`
// tiene su `page.tsx` bajo `app/[tenant]/(app)`.
describe("cada ítem del menú tiene su página", () => {
  const pageFor = (href: string) => {
    const path = href.split("?")[0];
    return join(process.cwd(), "app", "[tenant]", "(app)", ...path.split("/").filter(Boolean), "page.tsx");
  };

  it.each(VERTICALS.map((v) => [v]))("%s", (vertical) => {
    const hrefs = buildTenantNav(vertical, MODULES)
      .flatMap((g) => g.items)
      .map((i) => i.href);
    const missing = hrefs.filter((href) => !existsSync(pageFor(href)));
    expect(missing, `rutas del menú sin página en ${vertical}`).toEqual([]);
  });
});

// SEC-06: el servidor sabe qué módulo habilita cada ruta, con el menú como fuente.
describe("modulesForRoute", () => {
  it("una ruta de módulo y sus subrutas", () => {
    expect(modulesForRoute("/crm")).toEqual(["crm"]);
    expect(modulesForRoute("/crm/123/carnet")).toEqual(["crm"]);
    expect(modulesForRoute("/projects/9/budget")).toEqual(["construction"]);
    // La cotización genérica aún no tiene pantallas: no abre la suite APU.
    expect(modulesForRoute("/catalog")).toEqual(["construction"]);
  });

  it("Finanzas la habilitan Finanzas y Pagos", () => {
    expect([...(modulesForRoute("/finance") ?? [])].sort()).toEqual(["finance", "payments"]);
  });

  it("no confunde prefijos parecidos", () => {
    expect(modulesForRoute("/crmx")).toBeNull();
  });

  it("inicio, configuración y presencia no dependen de un módulo", () => {
    expect(modulesForRoute("")).toBeNull();
    expect(modulesForRoute("/settings")).toBeNull();
    expect(modulesForRoute("/presence")).toBeNull();
  });
});
