// Imprime el SQL que deja el equipo del panel listo en una base nueva: los
// roles del sistema (de lib/ops/permissions.ts, la misma lista que usa la
// app) y el Propietario por correo, sin cuenta de Clerk todavía. Se vincula
// solo cuando esa persona entra con ese correo verificado.
//
//   node scripts/staff-seed-sql.mjs dueno@ejemplo.com | psql "$URL"
import { OWNER_ROLE_KEY, SYSTEM_ROLES } from "../lib/ops/permissions.ts";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Uso: node scripts/staff-seed-sql.mjs <correo-del-propietario>");
  process.exit(1);
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const lines = ["BEGIN;"];
for (const r of SYSTEM_ROLES) {
  lines.push(
    `INSERT INTO "public"."StaffRole" ("id","key","name","description","permissions","system","createdAt","updatedAt")
VALUES (gen_random_uuid()::text, ${q(r.key)}, ${q(r.name)}, ${q(r.description)}, ARRAY[${r.permissions.map(q).join(",")}]::text[], true, now(), now())
ON CONFLICT ("key") DO UPDATE SET "permissions" = EXCLUDED."permissions", "updatedAt" = now();`,
  );
}
lines.push(
  `INSERT INTO "public"."StaffMember" ("id","clerkUserId","email","roleId","active","createdAt","updatedAt")
SELECT gen_random_uuid()::text, NULL, ${q(email)}, (SELECT "id" FROM "public"."StaffRole" WHERE "key" = ${q(OWNER_ROLE_KEY)}), true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "public"."StaffMember" WHERE "email" = ${q(email)});`,
  "COMMIT;",
);
console.log(lines.join("\n"));
