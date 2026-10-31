/**
 * `pnpm verify` no puede ocultar fallos.
 *
 * Entorno controlado: un `pnpm` falso (primero en el PATH) registra cada
 * comprobación que se le pide y falla en la que se le indique. No ejecuta
 * pruebas, base de datos ni build reales.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const SCRIPT = join(ROOT, "scripts", "verify.sh");
const STEPS = ["exec tsc --noEmit", "check:layers", "test --run", "test:integration", "build"];

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** Crea un `pnpm` falso. `failOn` = argumentos exactos que deben fallar. */
function fakePnpm(failOn: string | null) {
  const dir = mkdtempSync(join(tmpdir(), "nexus-verify-"));
  dirs.push(dir);
  const log = join(dir, "calls.log");
  writeFileSync(
    join(dir, "pnpm"),
    `#!/usr/bin/env bash
echo "$*" >> "${log}"
echo "$*=\${TEST_DATABASE_URL:-<vacía>}" >> "${log}.env"
if [ "$*" = "build" ]; then printf '○  (Static)   prerendered as static content\\nƒ  (Dynamic)  server-rendered on demand\\n'; fi
if [ -n "\${FAIL_ON:-}" ] && [ "$*" = "$FAIL_ON" ]; then echo "SALIDA-DEL-FALLO: $*"; exit 7; fi
echo "ok: $*"
`,
  );
  chmodSync(join(dir, "pnpm"), 0o755);
  return { dir, log, env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAIL_ON: failOn ?? "" } };
}

const calls = (log: string) => (existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : []);

describe("scripts/verify.sh", () => {
  test("si todo pasa: código 0 y corre las cinco comprobaciones en orden", () => {
    const f = fakePnpm(null);
    const r = spawnSync("bash", [SCRIPT], { env: f.env, encoding: "utf8" });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(calls(f.log)).toEqual(STEPS);
    expect(r.stdout).toContain("todo en verde");
    expect(r.stdout).toContain("(Static)");
  });

  test("las pruebas unitarias corren sin base de datos y la integración con la base indicada", () => {
    const f = fakePnpm(null);
    const env = { ...f.env, TEST_DATABASE_URL: "postgresql://prueba@127.0.0.1:1/x" };
    const r = spawnSync("bash", [SCRIPT], { env, encoding: "utf8" });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const seen = readFileSync(`${f.log}.env`, "utf8");
    expect(seen).toContain("test --run=<vacía>");
    expect(seen).toContain("test:integration=postgresql://prueba@127.0.0.1:1/x");
  });

  test.each(STEPS)("si falla «%s»: código distinto de cero, muestra su salida y no sigue", (step) => {
    const f = fakePnpm(step);
    const r = spawnSync("bash", [SCRIPT], { env: f.env, encoding: "utf8" });
    expect(r.status, "debe fallar").not.toBe(0);
    expect(r.status).toBe(7);
    expect(r.stdout + r.stderr).toContain(`SALIDA-DEL-FALLO: ${step}`);
    expect(r.stdout).not.toContain("todo en verde");
    // Las comprobaciones posteriores no se ejecutan.
    expect(calls(f.log)).toEqual(STEPS.slice(0, STEPS.indexOf(step) + 1));
  });
});

describe("regresión: la definición anterior ocultaba los fallos", () => {
  const OLD =
    "pnpm exec tsc --noEmit && pnpm check:layers && pnpm test --run 2>&1 | tail -3 && pnpm test:integration 2>&1 | tail -3 && pnpm build 2>&1 | grep -E '○|ƒ' | tail -2";

  test("con `test --run` fallando, la cadena vieja terminaba en 0 (el defecto que se corrigió)", () => {
    const f = fakePnpm("test --run");
    const r = spawnSync("bash", ["-c", OLD], { env: f.env, encoding: "utf8" });
    expect(r.status, "la cadena vieja devolvía éxito aunque la prueba falló").toBe(0);
  });

  test("package.json ya no usa esa cadena: verify llama al script", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.verify).toBe("bash ./scripts/verify.sh");
    expect(pkg.scripts.verify).not.toMatch(/\|\s*tail|\|\s*grep/);
  });
});
