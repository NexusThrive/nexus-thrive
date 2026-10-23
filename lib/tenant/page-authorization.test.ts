import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";
import { modulesForRoute } from "@/lib/navigation/tenant-nav";

/**
 * SEC-03 (docs/nexus-architecture/security-audit.md): cada página de un
 * negocio comprueba sesión + membresía activa por sí misma. El layout de
 * `app/[tenant]` no basta: en la navegación del App Router puede no
 * ejecutarse, y se renderiza en paralelo con la página.
 *
 * Si esta prueba falla, la página nueva debe llamar a `requirePageContext`
 * (o `requireTenantContext`) antes de leer datos del negocio.
 */
const ROOT = join(process.cwd(), "app", "[tenant]");

/** Páginas que no leen datos del negocio (y por qué). */
const EXEMPT: Record<string, string> = {
  "(app)/payments/page.tsx": "solo redirige a Finanzas",
};

function files(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, keep);
    return keep(name) ? [path] : [];
  });
}

const pages = (dir: string) => files(dir, (name) => name === "page.tsx");

/** Ruta del negocio a la que pertenece un archivo: "(app)/crm/[id]/page.tsx" → "/crm". */
function routeOf(rel: string): string {
  const first = rel.split("/").filter((p) => !(p.startsWith("(") && p.endsWith(")")))[0];
  return first && !first.endsWith(".tsx") && !first.endsWith(".ts") ? `/${first}` : "";
}

/** Rutas pasadas como segundo argumento a requirePageContext / requireTenantContext. */
function routesPassed(source: string): (string | null)[] {
  const alias = source.match(/requireTenantContext as (\w+)/)?.[1];
  const names = ["requirePageContext", alias ?? "requireTenantContext"];
  const local = /^(export )?async function requireTenantContext\(/m.test(source) && !alias;
  const out: (string | null)[] = [];
  for (const name of names) {
    if (name === "requireTenantContext" && local) continue;
    for (const m of source.matchAll(new RegExp(`\\b${name}\\(([^()\\n]*)\\)`, "g"))) {
      if (m.index && source.slice(Math.max(0, m.index - 16), m.index).includes("function ")) continue;
      out.push(m[1].match(/,\s*"([^"]*)"\s*$/)?.[1] ?? null);
    }
  }
  return out;
}

describe("autorización en cada página de un negocio", () => {
  const all = pages(ROOT).map((path) => ({ path, rel: relative(ROOT, path) }));

  test("hay páginas que revisar", () => {
    expect(all.length).toBeGreaterThan(10);
  });

  test.each(all.map((p) => [p.rel, p.path]))("%s comprueba la membresía", (rel, path) => {
    const source = readFileSync(path, "utf8");
    const authorizes = /\brequire(Page|Tenant)Context\(/.test(source);
    if (EXEMPT[rel]) {
      expect(authorizes, `${rel} está exenta: si ahora lee datos, quítala de EXEMPT`).toBe(false);
      expect(source).not.toMatch(/db\.orm|createTenantDb/);
      return;
    }
    expect(authorizes, `${rel} debe llamar a requirePageContext antes de leer datos`).toBe(true);
  });

  // SEC-06: si la página es de un módulo, se lo dice al servidor, que no la
  // sirve con el módulo apagado.
  test.each(all.map((p) => [p.rel, p.path]))("%s exige el módulo de su ruta", (rel, path) => {
    const expected = modulesForRoute(routeOf(rel));
    const passed = routesPassed(readFileSync(path, "utf8"));
    if (!expected) return;
    expect(passed.length, `${rel} no llama a requirePageContext`).toBeGreaterThan(0);
    for (const route of passed) {
      expect(route, `${rel} debe pasar la ruta de su módulo`).not.toBeNull();
      expect(modulesForRoute(route!)).toEqual(expected);
    }
  });

  test("las exenciones siguen existiendo", () => {
    for (const rel of Object.keys(EXEMPT)) {
      expect(all.some((p) => p.rel === rel), `${rel} ya no existe: quítala de EXEMPT`).toBe(true);
    }
  });
});

describe("cada acción de un módulo exige su módulo (SEC-06)", () => {
  const actions = files(ROOT, (name) => /actions\.ts$/.test(name)).map((path) => ({ path, rel: relative(ROOT, path) }));

  test("hay acciones que revisar", () => {
    expect(actions.length).toBeGreaterThan(10);
  });

  test.each(actions.map((a) => [a.rel, a.path]))("%s", (rel, path) => {
    if (!modulesForRoute(routeOf(rel))) return;
    const passed = routesPassed(readFileSync(path, "utf8"));
    expect(passed.length, `${rel} no comprueba el negocio`).toBeGreaterThan(0);
    for (const route of passed) {
      expect(route, `${rel}: cada requireTenantContext debe pasar la ruta del módulo`).not.toBeNull();
      expect(modulesForRoute(route!), `${rel}: "${route}" no es la ruta de un módulo`).not.toBeNull();
    }
  });
});
