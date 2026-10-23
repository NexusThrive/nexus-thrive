import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";

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
  "(app)/orders/page.tsx": "marcador estático del módulo, sin datos",
  "(app)/payments/page.tsx": "solo redirige a Finanzas",
};

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pages(path);
    return name === "page.tsx" ? [path] : [];
  });
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

  test("las exenciones siguen existiendo", () => {
    for (const rel of Object.keys(EXEMPT)) {
      expect(all.some((p) => p.rel === rel), `${rel} ya no existe: quítala de EXEMPT`).toBe(true);
    }
  });
});
