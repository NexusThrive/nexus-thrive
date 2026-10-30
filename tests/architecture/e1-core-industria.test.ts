/**
 * E1 · Core no conoce las industrias.
 *
 * Fija la forma de las dos capas de datos: `createTenantDb` (Core) no expone
 * propiedades de obra y `createConstructionDb` (industria) expone las mismas
 * diez de antes, con los mismos nombres. No necesita base de datos: las
 * fábricas solo crean closures; las consultas ocurren al llamarlas.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { createConstructionDb } from "@/lib/construction/construction-db";
import { createTenantDb } from "@/lib/tenant/db";

const ROOT = join(import.meta.dirname, "..", "..");
const CONSTRUCTION_KEYS = ["apu", "budgets", "fieldLog", "lean", "progress", "projectHeaders", "projectQuotes", "projects", "quotes", "reports"];

describe("createConstructionDb", () => {
  test("expone exactamente las diez propiedades de obra que antes colgaban de Core", () => {
    expect(Object.keys(createConstructionDb("negocio-a")).sort()).toEqual(CONSTRUCTION_KEYS);
  });

  test("cada propiedad es un repositorio con operaciones", () => {
    const construction = createConstructionDb("negocio-a");
    for (const key of CONSTRUCTION_KEYS) {
      const repo = construction[key as keyof typeof construction] as Record<string, unknown>;
      expect(typeof repo).toBe("object");
      expect(Object.keys(repo).length, key).toBeGreaterThan(0);
    }
  });

  test("rechaza un negocio vacío, igual que Core", () => {
    expect(() => createConstructionDb("")).toThrow(/tenantId/);
    expect(() => createConstructionDb("   ")).toThrow(/tenantId/);
  });
});

describe("createTenantDb (Core)", () => {
  test("ya no expone propiedades de obra", () => {
    const keys = Object.keys(createTenantDb("negocio-a"));
    for (const key of CONSTRUCTION_KEYS) expect(keys, key).not.toContain(key);
  });

  test("conserva sus repositorios de Core, Business y Finance", () => {
    const keys = Object.keys(createTenantDb("negocio-a"));
    for (const key of ["customers", "customerNotes", "users", "payments", "bookings", "expenses", "finance"]) expect(keys, key).toContain(key);
  });

  test("lib/tenant/db.ts no importa nada de construcción", () => {
    const source = readFileSync(join(ROOT, "lib/tenant/db.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["']@\/lib\/construction\//);
  });
});
