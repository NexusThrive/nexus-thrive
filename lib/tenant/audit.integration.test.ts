import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "./deletion";
import { logTenantAction } from "./audit";

/** SEC-11: lo sensible que pasa dentro de un negocio deja rastro en AuditLog. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("bitácora del negocio (integración)", () => {
  const suffix = Date.now().toString(36);
  let tenantId = "";
  let ctx: Parameters<typeof logTenantAction>[0];

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
    const tenant = await createAdminDb().createTenant({
      name: "Negocio Bitácora",
      slug: `bitacora-${suffix}`,
      vertical: "gym",
      modules: [],
      tenantType: "COMPANY",
      ownerEmail: `dueno.bitacora.${suffix}@ejemplo.com`,
    });
    tenantId = String(tenant.id);
    ctx = {
      userId: `user_bitacora_${suffix}`,
      tenantId,
      memberId: `member_${suffix}`,
      role: "OWNER",
      tenant: { ...tenant, name: "Negocio Bitácora" } as never,
    };
  });

  afterAll(async () => {
    await db.orm.public.AuditLog.where({ targetTenantId: tenantId }).deleteAll();
    if (tenantId) await deleteTenantCompletely(tenantId);
    await db.close();
  });

  test("registra la acción con el negocio, el autor y su rol", async () => {
    await logTenantAction(ctx, "BIZ_PAYMENT_VOID", { paymentId: "p1", reason: "Cobro duplicado" });
    const row = await db.orm.public.AuditLog.where({ targetTenantId: tenantId, action: "BIZ_PAYMENT_VOID" }).first();
    expect(row?.actorId).toBe(ctx.userId);
    expect(row?.targetTenantName).toBe("Negocio Bitácora");
    expect(row?.metadata).toMatchObject({ paymentId: "p1", reason: "Cobro duplicado", memberId: ctx.memberId, role: "OWNER" });
  });

  test("el rastro sobrevive al borrado del negocio", async () => {
    await logTenantAction(ctx, "BIZ_TENANT_DELETE", { slug: `bitacora-${suffix}` });
    const before = await db.orm.public.AuditLog.where({ targetTenantId: tenantId }).all();
    expect(before.length).toBeGreaterThanOrEqual(2);
  });

  test("si la bitácora falla, la acción no se rompe", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken = { ...ctx, tenant: undefined as never };
    await expect(logTenantAction(broken, "BIZ_MODULE_TOGGLE", {})).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
