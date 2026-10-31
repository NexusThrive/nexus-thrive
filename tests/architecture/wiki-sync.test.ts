/**
 * La sincronización con la Wiki de GitHub (scripts/wiki-sync.mjs) genera una copia plana de docs/wiki. Estas pruebas
 * comprueban que la copia es consistente (sin enlaces rotos ni páginas huérfanas) y que no hay publicación sin
 * confirmación. No tocan la red ni publican nada.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { build, convert, pageName, validate } from "../../scripts/wiki-sync.mjs";

const ROOT = join(import.meta.dirname, "..", "..");

describe("wiki-sync", () => {
  test("los nombres de página son planos y únicos", () => {
    expect(pageName("docs/wiki/Home.md")).toBe("Home");
    expect(pageName("docs/wiki/04-modulos/README.md")).toBe("04-modulos");
    expect(pageName("docs/wiki/04-modulos/capas/I-X/README.md")).toBe("04-modulos-capas-I-X");
    expect(pageName("docs/wiki/05-datos-y-base-de-datos/prisma-estructura.md")).toBe("05-datos-y-base-de-datos-prisma-estructura");
  });

  test("convierte enlaces: página de la wiki → nombre; código → URL de GitHub; roto → problema", () => {
    const pages = new Map([["docs/wiki/04-modulos/a.md", "04-modulos-a"], ["docs/wiki/04-modulos/README.md", "04-modulos"]]);
    const ctx = { pages, repoUrl: "https://example.test/r", branch: "main" };
    const { text, problems } = convert(
      "docs/wiki/Home.md",
      "---\nid: x\n---\n# T\n[a](04-modulos/a.md#sec) [i](04-modulos/) [c](../../lib/core/auth/permissions.ts) [r](../../nada.md)\n",
      ctx,
    );
    expect(text).toContain("](04-modulos-a#sec)");
    expect(text).toContain("](04-modulos)");
    expect(text).toContain("](https://example.test/r/blob/main/lib/core/auth/permissions.ts)");
    expect(text).not.toContain("id: x");
    expect(problems).toEqual(["docs/wiki/Home.md: enlace roto → ../../nada.md"]);
  });

  test("la wiki real se genera sin errores ni páginas huérfanas", () => {
    const out = mkdtempSync(join(tmpdir(), "wiki-test-"));
    const result = build({ out });
    const { errors, orphans } = validate(out, result);
    expect(errors).toEqual([]);
    expect(orphans).toEqual([]);
    expect(readdirSync(out)).toEqual(expect.arrayContaining(["Home.md", "_Sidebar.md", "_Footer.md"]));
    expect(readFileSync(join(out, "Home.md"), "utf8")).toContain("No la edites en la Wiki de GitHub");
  });

  test("publish sin --confirm es una simulación y --confirm exige NEXUS_WIKI_PUBLISH=yes", () => {
    const base = mkdtempSync(join(tmpdir(), "wiki-remote-"));
    const seed = join(base, "seed");
    mkdirSync(seed);
    const git = (...a: string[]) => execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd: seed, stdio: "pipe" });
    git("init", "-q");
    writeFileSync(join(seed, "Home.md"), "# vieja\n");
    git("add", "-A");
    git("commit", "-q", "-m", "seed");
    const remote = join(base, "remote.git");
    execFileSync("git", ["clone", "-q", "--bare", seed, remote], { stdio: "pipe" });
    const run = (extra: string[], env: Record<string, string> = {}) => {
      try {
        const stdout = execFileSync("node", ["scripts/wiki-sync.mjs", "publish", "--remote", remote, ...extra], { cwd: ROOT, encoding: "utf8", stdio: "pipe", env: { ...process.env, ...env } });
        return { code: 0, out: stdout };
      } catch (e) {
        const err = e as { status: number; stderr: string; stdout: string };
        return { code: err.status, out: `${err.stdout}${err.stderr}` };
      }
    };
    const heads = () => execFileSync("git", ["--git-dir", remote, "rev-list", "--all", "--count"], { encoding: "utf8" }).trim();

    const simulacion = run([]);
    expect(simulacion.code).toBe(0);
    expect(simulacion.out).toContain("SIMULACIÓN");
    expect(heads()).toBe("1");

    const sinVariable = run(["--confirm"], { NEXUS_WIKI_PUBLISH: "" });
    expect(sinVariable.code).toBe(1);
    expect(sinVariable.out).toContain("NEXUS_WIKI_PUBLISH=yes");
    expect(heads()).toBe("1");
  });
});
