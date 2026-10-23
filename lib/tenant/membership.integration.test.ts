import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "./deletion";
import { resolveTenantMembership } from "./membership";

/**
 * SEC-02 (docs/nexus-architecture/security-audit.md): un negocio creado desde
 * el panel nace sin miembros. Antes, el primero que abría `/{slug}` quedaba
 * como dueño. Ahora solo entra quien acepta la invitación OWNER con su correo
 * verificado.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("membresía al entrar a un negocio (integración)", () => {
  const suffix = Date.now().toString(36);
  const ownerEmail = `dueno.${suffix}@ejemplo.com`;
  let tenantId = "";

  const identity = (verifiedEmail: string | null) => async () => ({ verifiedEmail, name: "Prueba" });

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
    const tenant = await createAdminDb().createTenant({
      name: "Negocio Sin Dueño",
      slug: `sin-dueno-${suffix}`,
      vertical: "gym",
      modules: [],
      tenantType: "COMPANY",
      ownerEmail,
    });
    tenantId = String(tenant.id);
  });

  afterAll(async () => {
    if (tenantId) await deleteTenantCompletely(tenantId);
    await db.close();
  });

  test("el panel crea el negocio sin miembros y con una invitación OWNER al dueño", async () => {
    expect(await db.orm.public.User.where({ tenantId }).first()).toBeNull();
    const invite = await db.orm.public.TenantInvite.where({ tenantId }).first();
    expect(invite?.email).toBe(ownerEmail);
    expect(invite?.role).toBe("OWNER");
  });

  test("un tercero que abre el negocio vacío no queda como dueño", async () => {
    const stranger = await resolveTenantMembership({
      tenantId,
      clerkUserId: `user_tercero_${suffix}`,
      identity: identity(`tercero.${suffix}@ejemplo.com`),
    });
    expect(stranger).toBeNull();
    expect(await db.orm.public.User.where({ tenantId }).first()).toBeNull();
  });

  test("sin correo verificado no se acepta la invitación, aunque sea la del dueño", async () => {
    const unverified = await resolveTenantMembership({
      tenantId,
      clerkUserId: `user_sin_verificar_${suffix}`,
      identity: identity(null),
    });
    expect(unverified).toBeNull();
  });

  test("un correo parecido al del dueño no acepta su invitación", async () => {
    const lookalike = await resolveTenantMembership({
      tenantId,
      clerkUserId: `user_parecido_${suffix}`,
      identity: identity(ownerEmail.replace(".", "_")),
    });
    expect(lookalike).toBeNull();
  });

  test("el dueño entra con su correo verificado y queda como OWNER", async () => {
    const owner = await resolveTenantMembership({
      tenantId,
      clerkUserId: `user_dueno_${suffix}`,
      identity: identity(ownerEmail),
    });
    expect(owner?.role).toBe("OWNER");
    expect(owner?.active).toBe(true);
  });

  test("un integrante retirado no vuelve a entrar", async () => {
    const owner = await db.orm.public.User.where({ tenantId, clerkUserId: `user_dueno_${suffix}` }).first();
    await db.orm.public.User.where({ id: owner!.id }).update({ active: false });
    const again = await resolveTenantMembership({
      tenantId,
      clerkUserId: `user_dueno_${suffix}`,
      identity: identity(ownerEmail),
    });
    expect(again).toBeNull();
  });
});
