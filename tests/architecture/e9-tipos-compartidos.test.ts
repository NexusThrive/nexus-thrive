/**
 * E9 · Tipos y reglas de navegación que las capas bajas necesitan sin depender de la experiencia.
 *
 * - `nav-types.ts`: contrato de tipos del menú, compartido por el menú del negocio y el del panel de operaciones.
 * - `route-modules.ts`: qué módulos habilitan cada ruta (regla de acceso del servidor, junto al registro de capacidades).
 * - `onboarding/types.ts`: tipos del alta, que Core y beneficios usan sin importar la pantalla de onboarding.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore el verificador es un .mjs sin tipos
import { classify, loadJson } from "../../scripts/check-layers.mjs";
import { modulesForRoute as fromCore } from "@/lib/core/capabilities/route-modules";
import { modulesForRoute as fromNav } from "@/lib/experience/navigation/tenant-nav";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const layers = loadJson("docs/architecture/layers.json");
const importsOf = (rel: string) => [...read(rel).matchAll(/^import\s+(type\s+)?[\s\S]*?from\s+["']([^"']+)["']/gm)].map((m) => ({ typeOnly: !!m[1], from: m[2] }));

describe("tipos y reglas que dejaron de ser de experiencia", () => {
  test.each(["lib/core/capabilities/nav-types.ts", "lib/core/tenancy/onboarding/types.ts", "lib/core/capabilities/route-modules.ts"])("%s es de Core", (file) => {
    expect(classify(file, layers)?.layer).toBe("core");
  });

  test("nav-types.ts es solo tipos: todos sus imports son de tipo y no exporta valores", () => {
    expect(importsOf("lib/core/capabilities/nav-types.ts").every((i) => i.typeOnly)).toBe(true);
    expect(read("lib/core/capabilities/nav-types.ts")).not.toMatch(/^export (const|function|class|let)\b/m);
  });

  test("la experiencia sigue siendo de experiencia: el menú del negocio y el onboarding no pasaron a Core", () => {
    expect(classify("lib/experience/navigation/tenant-nav.ts", layers)?.layer).toBe("experience");
    expect(classify("lib/experience/onboarding/prefill.ts", layers)?.layer).toBe("experience");
  });

  test("tenant-nav reexporta la misma regla de rutas: una sola fuente", () => {
    expect(fromNav).toBe(fromCore);
    expect(fromCore("/contactos/123")).toEqual(["crm"]);
    expect(fromCore("/settings")).toBeNull();
  });

  test("el servidor (tenant/context) y el panel de operaciones ya no importan de tenant-nav", () => {
    for (const file of ["lib/core/tenancy/context.ts", "lib/platform/team/nav.ts"]) {
      expect(read(file), file).not.toContain("navigation/tenant-nav");
    }
  });
});
