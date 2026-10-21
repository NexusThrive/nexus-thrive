import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { findStaffByEmail, linkStaffToSession } from "./access";
import { unlinkStaffAccount } from "./team";

/**
 * Enlace entre una invitación del equipo de NEXUS y la cuenta de Clerk de la
 * persona.
 *
 * Estos casos son los que fallaban en producción: una ficha **pausada** o ya
 * **vinculada a otra cuenta** se saltaba el enlace en silencio, y la persona
 * terminaba en el onboarding creando un negocio por error.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("acceso del equipo de NEXUS (integración)", () => {
  const emails: string[] = [];

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
  });

  afterAll(async () => {
    for (const email of emails) {
      const row = await db.orm.public.StaffMember.where({ email }).first();
      if (row) await db.orm.public.StaffMember.where({ id: row.id }).delete();
    }
    await db.close();
  });

  async function makeMember(email: string, active = true, clerkUserId: string | null = null) {
    emails.push(email);
    const role = await db.orm.public.StaffRole.where({ key: "ops" }).first();
    if (!role) throw new Error("Falta el rol 'ops' (ejecuta la siembra del catálogo).");
    return db.orm.public.StaffMember.create({
      email,
      name: "Prueba Equipo",
      roleId: role.id,
      active,
      clerkUserId,
    });
  }

  test("encuentra la ficha por correo sin importar las mayúsculas", async () => {
    await makeMember("Equipo.Mayusculas@Ejemplo.com");
    const found = await findStaffByEmail("equipo.mayusculas@ejemplo.com");
    expect(found?.email).toBe("Equipo.Mayusculas@Ejemplo.com");
    expect(found?.active).toBe(true);
    expect(found?.linked).toBe(false);
  });

  test("vincula una ficha activa y pendiente con la cuenta de la sesión", async () => {
    await makeMember("equipo.vincula@ejemplo.com");
    const r = await linkStaffToSession("equipo.vincula@ejemplo.com", "user_vincula_1");
    expect(r).toEqual({ ok: true });
    const found = await findStaffByEmail("equipo.vincula@ejemplo.com");
    expect(found?.linked).toBe(true);
  });

  test("una ficha PAUSADA no se vincula (y lo dice)", async () => {
    await makeMember("equipo.pausado@ejemplo.com", false);
    const r = await linkStaffToSession("equipo.pausado@ejemplo.com", "user_pausado_1");
    expect(r).toEqual({ ok: false, reason: "inactive" });
    const found = await findStaffByEmail("equipo.pausado@ejemplo.com");
    expect(found?.linked).toBe(false);
  });

  test("una ficha ya vinculada a OTRA cuenta no se re-vincula", async () => {
    await makeMember("equipo.duplicado@ejemplo.com", true, "user_ya_existente");
    const r = await linkStaffToSession("equipo.duplicado@ejemplo.com", "user_otra_cuenta");
    expect(r).toEqual({ ok: false, reason: "other_account" });
    const found = await findStaffByEmail("equipo.duplicado@ejemplo.com");
    expect(found?.linked).toBe(true);
  });

  test("desvincular deja que la persona se enganche con cualquier cuenta", async () => {
    const member = await makeMember("equipo.desvincula@ejemplo.com", true, "user_antigua");
    const antes = await linkStaffToSession("equipo.desvincula@ejemplo.com", "user_nueva_1");
    expect(antes).toEqual({ ok: false, reason: "other_account" });

    await unlinkStaffAccount(member.id);
    const despues = await linkStaffToSession("equipo.desvincula@ejemplo.com", "user_nueva_1");
    expect(despues).toEqual({ ok: true });
  });

  test("un correo que no está en el equipo no inventa nada", async () => {
    expect(await findStaffByEmail("nadie@ejemplo.com")).toBeNull();
    expect(await linkStaffToSession("nadie@ejemplo.com", "user_x")).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});
