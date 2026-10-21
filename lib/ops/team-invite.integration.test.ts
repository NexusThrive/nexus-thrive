import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createStaffInvite, getStaffInvite, redeemStaffInvite } from "./team";

/**
 * Invitaciones al equipo de NEXUS: enlace de un solo uso que ata una cuenta de
 * Clerk concreta a la ficha del integrante.
 *
 * Es el cierre del hueco que quedaba: si la persona se registra con otro
 * correo, la ficha no se engancha por correo, pero sí por el enlace.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}


/**
 * El rol que necesitan las pruebas. En el CI la base está recién migrada y
 * sin sembrar, así que no se puede asumir que exista: si falta, se crea (y
 * se borra al terminar).
 */
async function ensureOpsRole(): Promise<{ id: string; created: boolean }> {
  const existing = await db.orm.public.StaffRole.where({ key: "ops" }).first();
  if (existing) return { id: String(existing.id), created: false };
  const created = await db.orm.public.StaffRole.create({
    key: "ops",
    name: "Técnico",
    description: null,
    permissions: ["accounts.view"],
    system: true,
  });
  return { id: String(created.id), created: true };
}

describe.skipIf(!enabled)("invitaciones al equipo (integración)", () => {
  const emails: string[] = [];
  let roleCreated = false;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
  });

  afterAll(async () => {
    for (const email of emails) {
      const member = await db.orm.public.StaffMember.where({ email }).first();
      if (member) {
        const invites = await db.orm.public.StaffInvite.where({ email }).all();
        for (const invite of invites) {
          await db.orm.public.StaffInvite.where({ id: invite.id }).delete();
        }
        await db.orm.public.StaffMember.where({ id: member.id }).delete();
      }
    }
    if (roleCreated) {
      await db.orm.public.StaffRole.where({ key: "ops" }).delete().catch(() => undefined);
    }
    await db.close();
  });

  async function makeMember(email: string, active = true) {
    emails.push(email);
    const role = await ensureOpsRole();
    if (role.created) roleCreated = true;
    return db.orm.public.StaffMember.create({
      email,
      name: "Prueba Invitación",
      roleId: role.id,
      active,
    });
  }

  test("el enlace ata la cuenta de Clerk a la ficha y se consume", async () => {
    await makeMember("invita.uno@ejemplo.com");
    const member = await db.orm.public.StaffMember.where({ email: "invita.uno@ejemplo.com" }).first();

    const invite = await createStaffInvite({ memberId: member!.id, createdById: null });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;

    const pendiente = await getStaffInvite(invite.token);
    expect(pendiente?.email).toBe("invita.uno@ejemplo.com");
    expect(pendiente?.usedAt).toBeNull();

    const usado = await redeemStaffInvite(invite.token, "user_invitado_1");
    expect(usado.ok).toBe(true);

    const vinculado = await db.orm.public.StaffMember.where({ email: "invita.uno@ejemplo.com" }).first();
    expect(vinculado?.clerkUserId).toBe("user_invitado_1");

    // Un segundo uso del mismo enlace no vale.
    const repetido = await redeemStaffInvite(invite.token, "user_invitado_2");
    expect(repetido.ok).toBe(false);
    if (repetido.ok) return;
    expect(repetido.reason).toBe("used");
  });

  test("el enlace no pisa una ficha ya vinculada a otra cuenta", async () => {
    await makeMember("invita.dos@ejemplo.com");
    const member = await db.orm.public.StaffMember.where({ email: "invita.dos@ejemplo.com" }).first();
    await db.orm.public.StaffMember.where({ id: member!.id }).update({ clerkUserId: "user_ya_otro" });

    const invite = await createStaffInvite({ memberId: member!.id, createdById: null });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;

    const r = await redeemStaffInvite(invite.token, "user_nuevo");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("other_account");

    const sigue = await db.orm.public.StaffMember.where({ email: "invita.dos@ejemplo.com" }).first();
    expect(sigue?.clerkUserId).toBe("user_ya_otro");
  });

  test("un enlace vencido no sirve", async () => {
    await makeMember("invita.tres@ejemplo.com");
    const member = await db.orm.public.StaffMember.where({ email: "invita.tres@ejemplo.com" }).first();
    const invite = await createStaffInvite({ memberId: member!.id, createdById: null, days: 1 });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;

    // Se vence mañana; lo echamos atrás para simular que ya venció.
    await db.orm.public.StaffInvite
      .where({ token: invite.token })
      .update({ expiresAt: Temporal.Instant.fromEpochMilliseconds(Date.now() - 1000) });

    const r = await redeemStaffInvite(invite.token, "user_tarde");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("expired");
  });

  test("un token que no existe no inventa nada", async () => {
    const r = await redeemStaffInvite("token-inventado", "user_x");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("not_found");
  });
});
