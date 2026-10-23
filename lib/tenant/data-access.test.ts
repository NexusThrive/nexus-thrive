import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { LEGACY_DB_ACCESS } from "../../eslint/legacy-db-access.mjs";

/**
 * ARCH-04: la lista de archivos de `app/` que todavía consultan la base solo
 * se achica. Si arreglas uno, sácalo de `eslint/legacy-db-access.mjs`.
 */
describe("deuda de acceso directo a la base", () => {
  test.each(LEGACY_DB_ACCESS.map((path: string) => [path]))("%s sigue en la lista con motivo", (path) => {
    const full = join(process.cwd(), path);
    expect(existsSync(full), `${path} ya no existe: quítalo de la lista`).toBe(true);
    expect(readFileSync(full, "utf8"), `${path} ya no importa la base: quítalo de la lista`).toMatch(
      /from "@\/prisma\/db"/,
    );
  });
});
