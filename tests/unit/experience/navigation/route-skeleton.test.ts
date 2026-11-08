import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { routeSkeleton } from "@/lib/experience/navigation/route-skeleton";

describe("routeSkeleton", () => {
  it("Inicio pinta el cajón y el CRM su tablero", () => {
    expect(routeSkeleton("/").variant).toBe("apps");
    expect(routeSkeleton("/crm").variant).toBe("board");
    expect(routeSkeleton("/crm?vista=lista").variant).toBe("board");
  });

  it("gana el prefijo más largo y lo literal le gana al comodín", () => {
    expect(routeSkeleton("/contactos").variant).toBe("list");
    expect(routeSkeleton("/contactos/nuevo").label).toBe("Cargando el formulario");
    expect(routeSkeleton("/contactos/abc123").label).toBe("Cargando ficha");
    expect(routeSkeleton("/crm/oportunidades/o1").variant).toBe("record");
    expect(routeSkeleton("/crm/informes").variant).toBe("dashboard");
    expect(routeSkeleton("/proyectos/catalogo-apu").variant).toBe("table");
    expect(routeSkeleton("/proyectos/p1").variant).toBe("detail");
    expect(routeSkeleton("/ventas/cotizaciones/anteriores/c1").variant).toBe("detail");
  });

  it("una ruta sin regla toma el esqueleto general", () => {
    expect(routeSkeleton("/algo-nuevo").variant).toBe("dashboard");
  });

  it("toda carpeta del negocio con loading.tsx tiene su regla (no cae al esqueleto general)", () => {
    const root = join(process.cwd(), "app/[tenant]/(app)");
    const dirs: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (name === "loading.tsx") dirs.push(relative(root, dir));
      }
    };
    walk(root);
    for (const dir of dirs.filter(Boolean)) {
      const path = "/" + dir.split("/").filter((p) => !p.startsWith("(")).map((p) => (p.startsWith("[") ? "x1" : p)).join("/");
      expect(routeSkeleton(path).label, path).not.toBe("Cargando");
    }
  });
});
