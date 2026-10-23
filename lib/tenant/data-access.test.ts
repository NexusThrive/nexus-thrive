import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { LEGACY_DB_ACCESS } from "../../eslint/legacy-db-access.mjs";

/**
 * ARCH-04 (bloque A.1–A.2): `app/` no consulta la base. La deuda llegó a cero
 * el 2026-10-23; esta prueba evita que vuelva, además de la regla de ESLint.
 */

const ROOT = process.cwd();

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(join(ROOT, path)).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("acceso a la base desde app/", () => {
  test("la lista de deuda está vacía", () => {
    expect(LEGACY_DB_ACCESS).toEqual([]);
  });

  test("ningún archivo de app/ importa la base, abre transacciones ni usa el ORM", () => {
    const offenders = sources("app").filter((file) =>
      /from "@\/prisma\/db"|\bmoneyTransaction\b|\.orm\.public\.|\.sql\.public\./.test(readFileSync(join(ROOT, file), "utf8")),
    );
    expect(offenders, "mueve la consulta a un repositorio de lib/ (con tenantId)").toEqual([]);
  });
});
