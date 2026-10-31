/**
 * V10 · M4 — `platform` pasa a ser un área con módulos propios (admin, benefits, team, billing, crm, support, inbox, accounts, presence).
 *
 * La tabla MODULES crece con cada commit de M4. Fija: cada archivo está en su módulo, ya no existe en su ubicación anterior,
 * ninguna referencia usa las rutas antiguas, los módulos de platform no forman ciclos entre sí, y las piezas que Core, Business y
 * las páginas de los negocios necesitan viven en una ubicación neutral (no en platform). No describe lógica de negocio: la lógica
 * no cambió.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore el verificador es un .mjs sin tipos
import { classify, loadJson, parseImports, resolveImport } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const exists = (rel: string) => existsSync(join(ROOT, rel));
const layers = loadJson("docs/architecture/layers.json");

/** módulo → { archivo nuevo ← ubicación anterior } (solo producción; las pruebas colocadas viajan con su módulo). */
const MODULES: Record<string, Record<string, string>> = {
  benefits: {
    "lib/platform/benefits/benefits.ts": "lib/benefits/benefits.ts",
    "lib/platform/benefits/benefits-db.ts": "lib/benefits/benefits-db.ts",
    "lib/platform/benefits/benefit-cookie.ts": "lib/benefits/benefit-cookie.ts",
  },
  admin: {
    "lib/platform/admin/db.ts": "lib/admin/db.ts",
    "lib/platform/admin/users-db.ts": "lib/admin/users-db.ts",
    "lib/platform/admin/account-limits.ts": "lib/admin/account-limits.ts",
    "lib/platform/admin/audit-labels.ts": "lib/admin/audit-labels.ts",
  },
  team: {
    "lib/platform/team/access.ts": "lib/ops/access.ts",
    "lib/platform/team/permissions.ts": "lib/ops/permissions.ts",
    "lib/platform/team/team.ts": "lib/ops/team.ts",
    "lib/platform/team/audit.ts": "lib/ops/audit.ts",
    "lib/platform/team/nav.ts": "lib/ops/nav.ts",
    "lib/platform/team/validators.ts": "lib/ops/validators.ts",
  },
  crm: {
    "lib/platform/crm/leads.ts": "lib/ops/leads.ts",
    "lib/platform/crm/crm-rules.ts": "lib/ops/crm-rules.ts",
  },
  billing: {
    "lib/platform/billing/billing.ts": "lib/ops/billing.ts",
    "lib/platform/billing/billing-rules.ts": "lib/ops/billing-rules.ts",
  },
  support: {
    "lib/platform/support/tickets.ts": "lib/ops/tickets.ts",
    "lib/platform/support/support-rules.ts": "lib/ops/support-rules.ts",
    "lib/platform/support/satisfaction.ts": "lib/ops/satisfaction.ts",
    "lib/platform/support/satisfaction-rules.ts": "lib/ops/satisfaction-rules.ts",
  },
};

const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((n) => {
    if (["node_modules", ".next", ".git", "docs", ".tools"].includes(n)) return [];
    const rel = `${dir}/${n}`;
    return statSync(join(ROOT, rel)).isDirectory() ? files(rel) : /\.(ts|tsx|mjs)$/.test(n) ? [rel] : [];
  });
const importsOf = (rel: string) => parseImports(read(rel)).map((i: { spec: string }) => i.spec);

describe("piezas neutrales que antes colgaban de módulos de Nexus (M4)", () => {
  test("withinLimit vive en Foundation y ya no en el programa de beneficios", () => {
    expect(exists("lib/foundation/limits.ts")).toBe(true);
    expect(classify("lib/foundation/limits.ts", layers)).toMatchObject({ layer: "foundation", byPath: true });
    expect(importsOf("lib/foundation/limits.ts")).toEqual([]);
    expect(read("lib/platform/benefits/benefits.ts") + (exists("lib/platform/benefits/benefits.ts") ? read("lib/platform/benefits/benefits.ts") : "")).not.toMatch(/export function withinLimit/);
  });

  test("las páginas de los negocios (app/[tenant]) ya no importan Operaciones: el día de hoy sale de Foundation", () => {
    const offenders = files("app/[tenant]").filter((f) => importsOf(f).some((s: string) => /^@\/lib\/(ops|platform\/(?!benefits\b))/.test(s)));
    expect(offenders).toEqual([]);
    expect(read("lib/platform/crm/leads.ts") + (exists("lib/platform/crm/leads.ts") ? read("lib/platform/crm/leads.ts") : "")).not.toMatch(/todayBogota/);
  });

  test("Core no importa la administración de la plataforma: las acciones BIZ_* las define Core (lib/tenant/audit.ts) y la plataforma las compone", () => {
    const tenant = read("lib/tenant/audit.ts");
    expect(tenant).not.toMatch(/@\/lib\/(admin|platform)\b/);
    expect(tenant).toMatch(/export type TenantAuditAction =\s*\n\s*\| "BIZ_PAYMENT_VOID"/);
    const admin = exists("lib/platform/admin/db.ts") ? read("lib/platform/admin/db.ts") : read("lib/platform/admin/db.ts");
    expect(admin).toContain('import type { TenantAuditAction } from "@/lib/tenant/audit"');
    expect(admin).not.toMatch(/\| "BIZ_/);
    const offenders = [...files("lib/tenant"), ...files("lib/auth"), ...files("lib/core"), ...files("lib/plans"), ...files("lib/operations"), ...files("lib/events")]
      .filter((f) => !/\.test\./.test(f))
      .filter((f) => importsOf(f).some((s: string) => /^@\/lib\/(admin\/(db|users-db|account-limits|audit-labels)|ops|benefits|platform)\b/.test(s)));
    expect(offenders).toEqual([]);
  });

  test("las páginas de los negocios solo importan platform en las tres referencias conocidas de beneficios (estado de acceso del negocio)", () => {
    // getTenantAccess y expireBenefitTrial las consumen el layout y los ajustes del propio negocio. Se dejan en platform/benefits
    // (cohesión con los datos de canje, y experiencia → platform está permitido); la lista no puede crecer sin una decisión.
    const users = files("app/[tenant]").filter((f) => importsOf(f).some((s: string) => /^@\/lib\/platform\//.test(s)));
    expect(users.sort()).toEqual(["app/[tenant]/(app)/settings/_components/plan-tab.tsx", "app/[tenant]/(app)/settings/page.tsx", "app/[tenant]/layout.tsx"]);
    for (const f of users) for (const s of importsOf(f).filter((x: string) => x.startsWith("@/lib/platform/"))) expect(s, f).toBe("@/lib/platform/benefits/benefits-db");
  });

  test("ningún módulo de Business ni de Core importa el programa de beneficios", () => {
    const offenders = [...files("lib/business"), ...files("lib/data-exchange"), ...files("lib/tenant"), ...files("lib/plans")]
      .filter((f) => !/\.test\./.test(f))
      .filter((f) => importsOf(f).some((s: string) => /^@\/lib\/(benefits|platform\/benefits)\b/.test(s)));
    expect(offenders).toEqual([]);
  });
});

describe("módulos de lib/platform (M4)", () => {
  test.each(Object.entries(MODULES))("%s: sus archivos están en lib/platform/%s/ y no en la ubicación anterior", (name, map) => {
    for (const [now, before] of Object.entries(map)) {
      expect(exists(now), now).toBe(true);
      expect(exists(before), `${before} no debería existir`).toBe(false);
      expect(now.startsWith(`lib/platform/${name}/`), now).toBe(true);
      expect(classify(now, layers)?.layer, now).toBe("platform");
    }
  });

  test("ninguna referencia en código usa una ruta anterior (absoluta, relativa, dinámica, vi.mock o literal)", () => {
    const bare = Object.values(MODULES).flatMap((m) => Object.values(m)).map((o) => o.replace(/\.tsx?$/, ""));
    const offenders: string[] = [];
    for (const f of [...files("app"), ...files("components"), ...files("lib"), ...files("tests"), ...files("scripts"), "eslint.config.mjs", "instrumentation.ts", "vitest.setup.ts"]) {
      if (f === "tests/architecture/v10-platform.test.ts") continue;
      const text = read(f);
      for (const b of bare) if (new RegExp(`(?<![\\w/.-])${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`).test(text) || text.includes(`"@/${b}"`)) offenders.push(`${f} → ${b}`);
    }
    expect(offenders).toEqual([]);
  });

  test("los módulos de platform no forman ciclos entre sí", () => {
    const moduleOf = (f: string) => /^lib\/platform\/([^/]+)\//.exec(f)?.[1] ?? null;
    const edges = new Map<string, Set<string>>();
    const platform = existsSync(join(ROOT, "lib/platform")) ? files("lib/platform") : [];
    for (const f of platform.filter((x) => !/\.test\./.test(x))) {
      const from = moduleOf(f);
      if (!from) continue;
      for (const { spec, typeOnly, dynamic } of parseImports(read(f))) {
        if (typeOnly || dynamic) continue;
        const to = moduleOf(resolveImport(f, spec, ROOT, exists) ?? "");
        if (to && to !== from) edges.set(from, (edges.get(from) ?? new Set()).add(to));
      }
    }
    for (const [a, set] of edges) for (const b of set) expect(edges.get(b)?.has(a) ?? false, `ciclo ${a} ⇄ ${b}`).toBe(false);
  });
});
