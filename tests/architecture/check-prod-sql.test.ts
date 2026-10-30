/**
 * Guardián de SQL de producción (scripts/check-prod-sql.sh).
 *
 * Regla: si cambia el modelo de datos, el cambio trae SQL en docs/prod-sql/.
 * Cambiar solo la documentación (`///`, `//`) o mover modelos entre archivos NO
 * es un cambio de modelo. Cualquier campo, tipo, relación, índice o restricción
 * distinto SÍ lo es. Cada caso crea un repositorio git temporal.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

const SCRIPT = join(import.meta.dirname, "..", "..", "scripts", "check-prod-sql.sh");

const CORE = `// use prisma-8

/// Negocio cliente de Nexus.
model Tenant {
  id    String @id @default(uuid())
  name  String
  plan  Plan   @default(FREE)
  url   String @default("https://nexus.example")
  customers Customer[]

  @@index([name])
}

enum Plan {
  FREE
  PRO
}
`;

const BUSINESS = `// use prisma-8

/// Cliente de un negocio.
model Customer {
  id       String  @id @default(uuid())
  tenantId String
  tenant   Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  email    String?
  age      Int

  @@unique([tenantId, email])
  @@index([tenantId])
}
`;

const BASE: Record<string, string> = {
  "prisma/schema/core.prisma": CORE,
  "prisma/schema/business.prisma": BUSINESS,
};

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]) {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
}

function write(dir: string, files: Record<string, string | null>) {
  for (const [rel, text] of Object.entries(files)) {
    const path = join(dir, rel);
    if (text === null) rmSync(path, { force: true });
    else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    }
  }
}

/** Repositorio con el esquema base en `main` y una rama con `changes` aplicados. */
function scenario(changes: Record<string, string | null>) {
  const dir = mkdtempSync(join(tmpdir(), "nexus-prod-sql-"));
  dirs.push(dir);
  git(dir, "init", "-q", "-b", "main");
  write(dir, BASE);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  git(dir, "switch", "-q", "-c", "cambio");
  write(dir, changes);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--allow-empty", "-m", "cambio");
  return dir;
}

function check(dir: string) {
  const r = spawnSync("bash", [SCRIPT, "main"], { cwd: dir, encoding: "utf8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

/** Aplica reemplazos de texto sobre un archivo del esquema base. */
const edit = (file: string, ...pairs: [string, string][]) => {
  let text = BASE[file];
  for (const [from, to] of pairs) {
    if (!text.includes(from)) throw new Error(`el caso de prueba no encuentra «${from}»`);
    text = text.replace(from, to);
  }
  return { [file]: text };
};
const CORE_F = "prisma/schema/core.prisma";
const BUS_F = "prisma/schema/business.prisma";

describe("cambios que NO son del modelo: pasan sin SQL", () => {
  const passing: [string, Record<string, string | null>][] = [
    ["sin cambios en el esquema", {}],
    ["cambiar el texto de una documentación ///", edit(CORE_F, ["/// Negocio cliente de Nexus.", "/// Organización cliente. Reescrita."])],
    ["agregar documentación /// a un campo", edit(CORE_F, ["  name  String", "  /// Nombre comercial.\n  name  String"])],
    ["agregar documentación /// con varias líneas encima del modelo", edit(BUS_F, ["/// Cliente de un negocio.", "/// Cliente de un negocio.\n///\n/// Campos:\n/// - `email`: correo opcional."])],
    ["quitar un comentario ///", edit(CORE_F, ["/// Negocio cliente de Nexus.\n", ""])],
    ["agregar comentarios // de línea completa", edit(CORE_F, ["  name  String", "  // nota interna\n  name  String"])],
    ["agregar un comentario // al final de la línea", edit(CORE_F, ["  name  String", "  name  String // nombre"])],
    ["mover un modelo a otro archivo", { [CORE_F]: BASE[CORE_F].replace(/model Tenant[\s\S]*?\n\}\n/, ""), "prisma/schema/tenant.prisma": `// use prisma-8\n\n${BASE[CORE_F].match(/model Tenant[\s\S]*?\n\}\n/)![0]}` }],
    ["mover un modelo y cambiar su documentación a la vez", { [BUS_F]: "// use prisma-8\n", "prisma/schema/customers/customer.prisma": `// use prisma-8\n\n/// Documentación nueva.\n${BASE[BUS_F].match(/model Customer[\s\S]*?\n\}\n/)![0]}` }],
    ["cambiar la sangría o los espacios finales", edit(BUS_F, ["  email    String?", "      email    String?   "])],
  ];
  test.each(passing)("%s", (_nombre, changes) => {
    const r = check(scenario(changes));
    expect(r.status, r.out).toBe(0);
  });
});

describe("cambios reales del modelo: exigen SQL de producción", () => {
  const failing: [string, Record<string, string | null>][] = [
    ["agregar un campo", edit(BUS_F, ["  age      Int", "  age      Int\n  phone    String?"])],
    ["eliminar un campo", edit(BUS_F, ["  age      Int\n", ""])],
    ["cambiar el tipo de un campo", edit(BUS_F, ["  age      Int", "  age      String"])],
    ["cambiar un campo a opcional", edit(BUS_F, ["  age      Int", "  age      Int?"])],
    ["cambiar un valor por defecto", edit(CORE_F, ["@default(FREE)", "@default(PRO)"])],
    ["cambiar un valor por defecto que contiene //", edit(CORE_F, ['@default("https://nexus.example")', '@default("https://otro.example")'])],
    ["renombrar un campo", edit(BUS_F, ["  email    String?", "  correo   String?"])],
    ["agregar una relación", edit(BUS_F, ["  age      Int", "  age      Int\n  ownerId  String?\n  owner    Tenant? @relation(\"owner\", fields: [ownerId], references: [id])"])],
    ["cambiar el comportamiento onDelete de una relación", edit(BUS_F, ["onDelete: Cascade", "onDelete: Restrict"])],
    ["agregar un índice", edit(BUS_F, ["  @@index([tenantId])", "  @@index([tenantId])\n  @@index([age])"])],
    ["quitar un índice", edit(BUS_F, ["\n  @@index([tenantId])", ""])],
    ["cambiar un índice", edit(BUS_F, ["@@index([tenantId])", "@@index([tenantId, age])"])],
    ["agregar una restricción única", edit(BUS_F, ["  @@index([tenantId])", "  @@unique([tenantId, age])\n  @@index([tenantId])"])],
    ["quitar una restricción única", edit(BUS_F, ["  @@unique([tenantId, email])\n", ""])],
    ["agregar un modelo", { "prisma/schema/nuevo.prisma": "// use prisma-8\n\nmodel Nota {\n  id String @id\n}\n" }],
    ["eliminar un modelo", { [BUS_F]: "// use prisma-8\n" }],
    ["agregar un valor a un enum", edit(CORE_F, ["  PRO\n", "  PRO\n  ENTERPRISE\n"])],
    ["quitar un valor de un enum", edit(CORE_F, ["  PRO\n", ""])],
    ["pasar un campo de un modelo a otro", { [BUS_F]: BASE[BUS_F].replace("  age      Int\n", ""), [CORE_F]: BASE[CORE_F].replace("  name  String", "  name  String\n  age      Int") }],
    ["cambiar un campo junto con un cambio de documentación", edit(CORE_F, ["/// Negocio cliente de Nexus.", "/// Otra documentación."], ["  name  String", "  name  Int"])],
  ];
  test.each(failing)("%s", (_nombre, changes) => {
    const r = check(scenario(changes));
    expect(r.status, r.out).toBe(1);
    expect(r.out).toContain("no hay ningún SQL nuevo");
  });

  test("pasa si el mismo cambio trae SQL en docs/prod-sql/", () => {
    const dir = scenario({ ...edit(BUS_F, ["  age      Int", "  age      Int\n  phone    String?"]), "docs/prod-sql/2026-10-30-telefono.sql": "ALTER TABLE \"Customer\" ADD COLUMN IF NOT EXISTS \"phone\" text;\n" });
    const r = check(dir);
    expect(r.status, r.out).toBe(0);
    expect(r.out).toContain("SQL de producción presente");
  });
});

test("el esquema en un solo archivo antiguo se compara bien con el esquema dividido", () => {
  const dir = mkdtempSync(join(tmpdir(), "nexus-prod-sql-"));
  dirs.push(dir);
  git(dir, "init", "-q", "-b", "main");
  write(dir, { "prisma/contract.prisma": `// use prisma-8\n\n${CORE.replace("// use prisma-8\n\n", "")}\n${BUSINESS.replace("// use prisma-8\n\n", "")}` });
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  git(dir, "switch", "-q", "-c", "cambio");
  rmSync(join(dir, "prisma/contract.prisma"));
  write(dir, BASE);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "dividir");
  const r = check(dir);
  expect(r.status, r.out).toBe(0);
});
