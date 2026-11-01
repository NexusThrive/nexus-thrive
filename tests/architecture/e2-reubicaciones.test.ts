/**
 * E2 · Lo que estaba mal ubicado ya está donde corresponde.
 *
 * Fija las reubicaciones (permisos, roles y equipo a Core; gimnasio y museo a
 * lib/industry/) y las dependencias que se invirtieron, para que no vuelvan sin
 * que falle una prueba. Las reglas generales de capas viven en layers.test.ts.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const exists = (rel: string) => existsSync(join(ROOT, rel));
const exceptions = JSON.parse(read("docs/architecture/exceptions.json")) as { exceptions: { regla: string; etapa: string }[] };

describe("permisos, roles y equipo viven en Core", () => {
  test.each(["lib/core/auth/permissions.ts", "lib/core/auth/roles.ts", "tests/unit/core/auth/permissions.test.ts", "lib/core/tenancy/team-db.ts"])("existe %s", (file) => {
    expect(exists(file)).toBe(true);
  });

  test.each(["permissions", "roles", "team-db"])("lib/business/%s.ts ya no existe", (name) => {
    expect(exists(`lib/business/${name}.ts`)).toBe(false);
  });
});

describe("gimnasio y museo viven en lib/industry/", () => {
  test.each([
    "lib/industry/gym/gym.ts",
    "lib/industry/gym/gym-db.ts",
    "lib/industry/gym/memberships.ts",
    "lib/industry/gym/memberships-db.ts",
    "lib/industry/gym/memberships-repo.ts",
    "lib/industry/gym/enrollment-db.ts",
    "lib/industry/museum/museum.ts",
    "lib/industry/museum/museum-db.ts",
  ])("existe %s", (file) => {
    expect(exists(file)).toBe(true);
  });

  test("lib/business no contiene archivos de gimnasio ni de museo", () => {
    for (const name of ["gym", "gym-db", "memberships", "memberships-db", "memberships-repo", "enrollment-db", "museum", "museum-db"]) {
      expect(exists(`lib/business/${name}.ts`), name).toBe(false);
    }
  });
});

describe("dependencias invertidas", () => {
  test("el outbox de eventos (Core) no importa del servicio de dinero (Business)", () => {
    expect(read("lib/core/events/outbox.ts")).not.toMatch(/@\/lib\/business\//);
  });

  test("lib/files (Core) no importa de la plataforma de NEXUS", () => {
    expect(read("lib/core/files/stored-files.ts")).not.toMatch(/@\/lib\/ops\//);
  });

  test("las rutas de archivos entregan la compuerta del equipo NEXUS de forma explícita", () => {
    expect(read("app/api/files/[id]/route.ts")).toContain("readAttachmentFor(userId, id, staffCanViewAccounts)");
    expect(read("app/api/apu-images/[imageId]/route.ts")).toContain("readApuImageFor(userId, imageId, staffCanViewAccounts)");
  });

  test("escapeLike tiene una sola definición (Foundation)", () => {
    for (const file of ["lib/platform/admin/db.ts", "lib/core/tenancy/db.ts", "lib/industry/gym/gym-db.ts"]) {
      expect(read(file), file).not.toMatch(/function escapeLike/);
    }
    expect(read("lib/foundation/db/sql-like.ts")).toMatch(/export function escapeLike/);
  });
});

describe("excepciones de industria", () => {
  test("no queda ninguna R1 ni R2: nadie importa una industria desde fuera, y las industrias no se importan entre sí", () => {
    const left = exceptions.exceptions.filter((e) => e.regla.startsWith("R1") || e.regla.startsWith("R2"));
    expect(left).toEqual([]);
  });

  test("no queda ninguna excepción de las etapas E1 ni E2", () => {
    expect(exceptions.exceptions.filter((e) => /^E[12]\b/.test(e.etapa))).toEqual([]);
  });
});
