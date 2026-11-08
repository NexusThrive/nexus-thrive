import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VERTICALS } from "@/lib/core/sectors/verticals";
import { MODULES } from "@/lib/core/capabilities/modules";
import { activeNavItem, buildTenantNav, isNavActive, modulesForRoute, tenantRelativePath } from "@/lib/experience/navigation/tenant-nav";
import { quickCreateActions, quickSheetFor } from "@/lib/experience/navigation/quick-create";

describe("buildTenantNav", () => {
  it("siempre muestra Resumen aunque el módulo de panel no esté activo", () => {
    const groups = buildTenantNav("construction", ["construction"]);
    expect(groups[0].items.map((i) => i.label)).toEqual(["Resumen"]);
  });

  it("solo muestra funciones activas y siempre Funciones y Configuración", () => {
    const groups = buildTenantNav("retail", ["dashboard", "crm"]);
    expect(groups.map((g) => g.label)).toEqual(["General", "Clientes y agenda", "CRM", "Sistema"]);
    expect(groups.flatMap((g) => g.items).map((i) => i.href)).toEqual(["/resumen", "/contactos", "/crm", "/crm/informes", "/crm/configuracion", "/functions", "/data", "/integrations", "/settings"]);
  });

  it("agrupa por trabajo, con todas las categorías desplegables, y omite los grupos vacíos", () => {
    const groups = buildTenantNav("retail", ["dashboard", "crm", "memberships", "finance", "payments", "pos", "online_payments", "billing", "einvoicing", "receivables", "accounting", "taxes", "whatsapp"]);
    expect(groups.map((g) => g.label)).toEqual(["General", "Clientes y agenda", "CRM", "Ventas y cobros", "Compras y gastos", "Finanzas y contabilidad", "Canales", "Sistema"]);
    // Facturación, punto de venta y cobros van en Ingresos; Pagos vive dentro de Finanzas y no se repite.
    const ingresos = groups.find((g) => g.label === "Ventas y cobros")!;
    expect(ingresos.collapsible).toBe(true);
    expect(ingresos.items.map((i) => i.label)).toEqual(["Facturación", "Punto de venta", "Cobros en línea", "Factura electrónica"]);
    // Con Finanzas activa hay una categoría «Gastos».
    const gastos = groups.find((g) => g.label === "Compras y gastos")!;
    expect(gastos.collapsible).toBe(true);
    expect(gastos.items.map((i) => i.label)).toEqual(["Gastos"]);
    expect(groups.find((g) => g.label === "Finanzas y contabilidad")?.items.map((i) => i.label)).toEqual(["Finanzas", "¿Dónde está mi dinero?", "Cartera", "Contabilidad", "Impuestos y numeración"]);
    // Toda categoría es una opción desplegable con su icono; Inicio (General) y Sistema no.
    expect(groups.find((g) => g.label === "Clientes y agenda")?.collapsible).toBe(true);
    expect(groups.find((g) => g.label === "Clientes y agenda")?.icon).toBeDefined();
    expect(groups.find((g) => g.label === "General")?.icon).toBeUndefined();
  });

  it("cada pantalla aparece solo si su función está encendida: Pagos no trae punto de venta ni Finanzas trae contabilidad", () => {
    const labels = (mods: Parameters<typeof buildTenantNav>[1]) => buildTenantNav("retail", mods).flatMap((g) => g.items).map((i) => i.label);
    const base = labels(["dashboard", "crm", "payments", "finance", "billing"]);
    for (const hidden of ["Punto de venta", "Cobros en línea", "Cartera", "Contabilidad", "Impuestos y numeración", "Factura electrónica", "Mi sitio web", "Ficha de Google", "Campañas y reseñas"]) expect(base).not.toContain(hidden);
    expect(labels(["dashboard", "pos", "website", "google", "growth"])).toEqual(expect.arrayContaining(["Punto de venta", "Mi sitio web", "Pedidos", "Ficha de Google", "Campañas y reseñas"]));
    expect(buildTenantNav("retail", ["dashboard", "website"]).map((g) => g.label)).toContain("Presencia en línea");
  });

  it("el gimnasio trae un menú reducido: sin Funciones, datos, integraciones, Gastos ni tienda", () => {
    const groups = buildTenantNav("gym", ["dashboard", "crm", "memberships", "finance", "website"]);
    const items = groups.flatMap((g) => g.items);
    expect(items.map((i) => i.href)).toEqual(["/resumen", "/contactos", "/memberships", "/checkin", "/finanzas", "/finanzas/dinero", "/presencia/sitio", "/settings"]);
    expect(items.find((i) => i.href === "/presencia/sitio")?.label).toBe("Panel de registro de cliente");
    for (const hidden of ["/ventas/pedidos", "/crm", "/crm/informes", "/crm/configuracion", "/crm/tareas", "/crm/formularios", "/proyectos/entregables"]) expect(items.map((i) => i.href)).not.toContain(hidden);
  });

  it("sin facturación ni gastos no aparecen esas categorías", () => {
    const labels = buildTenantNav("gym", ["dashboard", "crm"]).map((g) => g.label);
    expect(labels).not.toContain("Ventas y cobros");
    expect(labels).not.toContain("Compras y gastos");
  });

  it("la suite de construcción abre Obras, Cotizaciones y Catálogo APU", () => {
    const labels = buildTenantNav("construction", ["construction"])
      .flatMap((g) => g.items)
      .map((i) => i.label);
    expect(labels).toEqual(["Resumen", "Obras", "Cotizaciones", "Catálogo APU", "Funciones", "Importar y exportar", "Integraciones", "Configuración"]);
  });
});

describe("ARCH-01: construcción separada de cotizaciones", () => {
  it("un rubro que no construye no ve pantallas APU aunque tenga cotizaciones", () => {
    const hrefs = buildTenantNav("mechanic", ["dashboard", "crm", "quotes"]).flatMap((g) => g.items).map((i) => i.href);
    expect(hrefs).not.toContain("/proyectos/catalogo-apu");
    expect(hrefs).not.toContain("/proyectos");
  });
});

describe("ruta activa", () => {
  it("quita el slug del negocio", () => {
    expect(tenantRelativePath("/acme", "acme")).toBe("/");
    expect(tenantRelativePath("/acme/proyectos/9", "acme")).toBe("/proyectos/9");
  });

  it("inicio solo coincide en la raíz; los módulos también en subrutas", () => {
    expect(isNavActive("", "/")).toBe(true);
    expect(isNavActive("", "/contactos")).toBe(false);
    expect(isNavActive("/proyectos", "/proyectos/9")).toBe(true);
    expect(isNavActive("/project", "/proyectos")).toBe(false);
  });

  it("encuentra el ítem activo", () => {
    const groups = buildTenantNav("construction", ["dashboard", "construction"]);
    expect(activeNavItem(groups, "/ventas/cotizaciones/anteriores/4")?.label).toBe("Cotizaciones");
    // La ruta más específica gana: Informes y Configuración del CRM no se quedan en Pipeline.
    const crm = buildTenantNav("retail", ["dashboard", "crm"]);
    expect(activeNavItem(crm, "/crm")?.label).toBe("Pipeline");
    expect(activeNavItem(crm, "/crm/informes")?.label).toBe("Informes");
    expect(activeNavItem(crm, "/crm/configuracion")?.label).toBe("Configuración");
    expect(activeNavItem(crm, "/crm/oportunidades/abc")?.label).toBe("Pipeline");
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

// ARCH-02 (docs/internal/historico/nexus-architecture/technical-debt.md): ningún ítem del menú
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
    expect(modulesForRoute("/contactos")).toEqual(["crm"]);
    expect(modulesForRoute("/contactos/123/carnet")).toEqual(["crm"]);
    expect(modulesForRoute("/proyectos/9/budget")).toEqual(["construction"]);
    // La cotización genérica aún no tiene pantallas: no abre la suite APU.
    expect(modulesForRoute("/proyectos/catalogo-apu")).toEqual(["construction"]);
  });

  it("Finanzas la habilitan Finanzas y Pagos", () => {
    expect([...(modulesForRoute("/finanzas") ?? [])].sort()).toEqual(["finance", "payments"]);
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

describe("quickCreateActions por permisos", () => {
  const mods = ["construction", "crm", "finance"] as const;
  it("sin rol ofrece todo (compatibilidad)", () => {
    expect(quickCreateActions("construction", [...mods], Infinity).map((a) => a.key)).toContain("payment");
  });
  it("un asesor no registra pagos ni gastos", () => {
    const keys = quickCreateActions("construction", [...mods], Infinity, "ADVISOR").map((a) => a.key);
    expect(keys).not.toContain("payment");
    expect(keys).not.toContain("expense");
    expect(keys).toContain("new-customer");
  });
  it("solo el propietario crea obras; recepción cobra pero no crea obras", () => {
    expect(quickCreateActions("construction", [...mods], Infinity, "OWNER").map((a) => a.key)).toContain("new-project");
    const reception = quickCreateActions("construction", [...mods], Infinity, "RECEPTION").map((a) => a.key);
    expect(reception).not.toContain("new-project");
    expect(reception).toContain("payment");
  });
});

describe("quickSheetFor", () => {
  it("pago, gasto y socio nuevo tienen mini-modal; el resto navega", () => {
    expect(quickSheetFor("payment")).toBe("payment");
    expect(quickSheetFor("expense")).toBe("expense");
    expect(quickSheetFor("new-customer")).toBe("customer");
    expect(quickSheetFor("booking")).toBeNull();
    expect(quickSheetFor("invoice")).toBeNull();
  });
});

describe("menú por rol (HU-navegacion-commerce-01)", () => {
  const hrefs = (role?: string) => buildTenantNav("retail", ["dashboard", "orders", "finance", "payments", "crm"], role).flatMap((g) => g.items.map((i) => i.href));
  it("quien produce ve Pedidos pero no cobros ni finanzas", () => {
    const advisor = hrefs("ADVISOR");
    expect(advisor).toContain("/ventas/pedidos");
    for (const h of ["/finanzas", "/finanzas?tab=gastos", "/ventas/cobros", "/finanzas/dinero", "/finanzas/cartera"]) expect(advisor).not.toContain(h);
  });
  it("quien maneja dinero ve todo, y sin rol se muestra todo", () => {
    expect(hrefs("OWNER")).toEqual(expect.arrayContaining(["/ventas/pedidos", "/finanzas"]));
    expect(hrefs()).toEqual(expect.arrayContaining(["/ventas/pedidos", "/finanzas"]));
  });
});

describe("reparto del menú por trabajo (etapa A6)", () => {
  it("CRM tiene Ventas, Informes y Configuración (tareas, entregables y formularios conservan su ruta); Clientes queda con los contactos", () => {
    const groups = buildTenantNav("retail", ["dashboard", "crm"]);
    const crm = groups.find((g) => g.label === "CRM")!;
    expect(crm.items.map((i) => i.href)).toEqual(["/crm", "/crm/informes", "/crm/configuracion"]);
    expect(groups.find((g) => g.label === "Clientes y agenda")!.items.map((i) => i.href)).toEqual(["/contactos"]);
  });
  it("cotizaciones y pedidos van en Ventas, no en obras", () => {
    const groups = buildTenantNav("retail", ["dashboard", "quotes", "orders"]);
    expect(groups.find((g) => g.label === "Ventas y cobros")!.items.map((i) => i.href)).toEqual(expect.arrayContaining(["/ventas/cotizaciones", "/ventas/pedidos"]));
    expect(groups.find((g) => g.label === "Obras y proyectos")).toBeUndefined();
  });
});
