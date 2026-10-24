// Convierte una migración de Prisma 8 (migrations/app/<dir>/ops.json) en el SQL
// de producción que pide `scripts/check-prod-sql.sh` (docs/prod-sql/<fecha>-<tema>.sql):
// las mismas sentencias, en el mismo orden, dentro de una transacción.
//
//   node scripts/migration-sql.mjs <carpeta-de-la-migración> "<título>" [salida.sql]
//   ej.: node scripts/migration-sql.mjs 20261024T0129_api_llaves "API: llaves por negocio"
//
// Las sentencias salen tal cual las ejecuta `prisma db migrate`; el archivo no se
// reescribe a mano. Producción se actualiza con `prisma db migrate --db <producción>`
// antes de fusionar; este archivo queda como historial y para revisar.

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const [dir, title, outArg] = process.argv.slice(2);
if (!dir || !title) {
  console.error('Uso: node scripts/migration-sql.mjs <carpeta> "<título>" [salida.sql]');
  process.exit(1);
}
const ops = JSON.parse(readFileSync(join(root, "migrations/app", dir, "ops.json"), "utf8"));
const date = dir.slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
const slug = dir.slice(14);
const out = outArg ?? join(root, "docs/prod-sql", `${date}-${slug.replace(/_/g, "-")}.sql`);

const statements = ops.flatMap((op) => (op.execute ?? []).map((step) => step.sql.trim().replace(/;$/, "")));
const body = [
  "-- ============================================================================",
  `-- ${date} · ${title}`,
  "--",
  `-- Equivale a la migración migrations/app/${dir}.`,
  "-- Generado con scripts/migration-sql.mjs a partir de su ops.json: mismas",
  "-- sentencias, mismo orden. Aditivo.",
  "--",
  "-- Producción se actualiza con `pnpm exec prisma db migrate --db <producción>`",
  "-- ANTES de desplegar la versión que lo trae (regla de scripts/check-prod-sql.sh).",
  "-- ============================================================================",
  "",
  "BEGIN;",
  "",
  ...statements.map((s) => `${s};\n`),
  "COMMIT;",
  "",
].join("\n");
writeFileSync(out, body);
console.log(`${out} (${statements.length} sentencias)`);
