import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createBenefitCode, expireBenefitTrial, redeemBenefit } from "@/lib/benefits/benefits-db";
import { saveCustomer } from "@/lib/business/customers-db";
import { seatLimit } from "@/lib/business/team-db";

/**
 * Integración del canje de accesos:
 *
 * - un código de UN uso no se puede regalar dos veces (carrera incluida);
 * - un código ilimitado se puede canjear en negocios distintos;
 * - el tipo del código (PROMO/PAID) queda copiado en el canje.
 *
 * NO tocan la base de desarrollo: se saltan salvo que exista
 * `TEST_DATABASE_URL`, y además exigen que `DATABASE_URL` apunte a esa misma
 * base.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("canje de accesos (integración)", () => {
  const createdCodes: string[] = [];
  const createdTenants: string[] = [];

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
  });

  afterAll(async () => {
    for (const tenantId of createdTenants) {
      const modules = await db.orm.public.TenantModule.where({ tenantId }).all();
      for (const row of modules) {
        await db.orm.public.TenantModule.where({ id: row.id }).delete().catch(() => undefined);
      }
      await db.orm.public.Subscription.where({ tenantId }).delete().catch(() => undefined);
      await db.orm.public.Tenant.where({ id: tenantId }).delete().catch(() => undefined);
    }
    for (const code of createdCodes) {
      const benefit = await db.orm.public.BenefitCode.where({ code }).first();
      if (benefit) {
        const redemptions = await db.orm.public.BenefitRedemption.where({ codeId: benefit.id }).all();
        for (const row of redemptions) {
          await db.orm.public.BenefitRedemption.where({ id: row.id }).delete().catch(() => undefined);
        }
        await db.orm.public.BenefitCode.where({ id: benefit.id }).delete().catch(() => undefined);
      }
    }
    await db.close();
  });

  async function makeTenant(slug: string): Promise<string> {
    const tenant = await db.orm.public.Tenant.create({
      name: slug,
      slug,
      vertical: "retail",
      tenantType: "INDIVIDUAL",
      city: "Turbaco",
      onboardingCompleted: true,
      plan: "ESSENTIAL",
    });
    createdTenants.push(tenant.id);
    return tenant.id;
  }

  test("un código de un solo uso no se canjea dos veces", async () => {
    const created = await createBenefitCode(
      { label: "Acceso pagado test", kind: "PAID", plan: "ELITE", durationDays: 30, maxUses: 1 },
      null,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdCodes.push(created.code);

    const tenantA = await makeTenant(`test-acceso-a-${Date.now().toString(36)}`);
    const tenantB = await makeTenant(`test-acceso-b-${Date.now().toString(36)}`);

    const [a, b] = await Promise.all([
      redeemBenefit({ code: created.code, tenantId: tenantA, tenantName: "A" }),
      redeemBenefit({ code: created.code, tenantId: tenantB, tenantName: "B" }),
    ]);

    const ok = [a, b].filter((r) => r.ok);
    expect(ok).toHaveLength(1);
    const fail = [a, b].find((r) => !r.ok);
    expect(fail && !fail.ok ? fail.reason : "").toBe("exhausted");

    // El que pasó queda con el plan del código y una suscripción de prueba.
    const winner = ok[0];
    expect(winner.ok).toBe(true);
    if (!winner.ok) return;
    expect(winner.kind).toBe("PAID");
    const winnerTenantId = a.ok ? tenantA : tenantB;
    const tenant = await db.orm.public.Tenant.where({ id: winnerTenantId }).first();
    const sub = await db.orm.public.Subscription.where({ tenantId: winnerTenantId }).first();
    expect(sub?.status).toBe("TRIAL");
    expect(tenant?.plan).toBe("ELITE");
  });

  test("un código ilimitado se canjea en negocios distintos", async () => {
    const created = await createBenefitCode(
      { label: "Promo test", kind: "PROMO", plan: "ELITE", durationDays: 30, maxUses: null },
      null,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdCodes.push(created.code);

    const tenantA = await makeTenant(`test-promo-a-${Date.now().toString(36)}`);
    const tenantB = await makeTenant(`test-promo-b-${Date.now().toString(36)}`);

    const a = await redeemBenefit({ code: created.code, tenantId: tenantA, tenantName: "A" });
    const b = await redeemBenefit({ code: created.code, tenantId: tenantB, tenantName: "B" });

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok) expect(a.kind).toBe("PROMO");

    const used = await db.orm.public.BenefitCode.where({ code: created.code }).first();
    expect(Number(used?.usedCount)).toBe(2);
  });

  test("el mismo negocio no canjea dos veces el mismo código", async () => {
    const created = await createBenefitCode(
      { label: "Promo test 2", kind: "PROMO", plan: "ELITE", durationDays: 30, maxUses: null },
      null,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdCodes.push(created.code);

    const tenant = await makeTenant(`test-idem-${Date.now().toString(36)}`);
    const first = await redeemBenefit({ code: created.code, tenantId: tenant, tenantName: "A" });
    const second = await redeemBenefit({ code: created.code, tenantId: tenant, tenantName: "A" });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("already");
  });

  test("al vencer el acceso el negocio vuelve al plan gratuito", async () => {
    const created = await createBenefitCode(
      { label: "Pago 1 día", kind: "PAID", plan: "SIGNATURE", durationDays: 1, maxUses: 1 },
      null,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdCodes.push(created.code);

    const tenant = await makeTenant(`test-expira-${Date.now().toString(36)}`);
    const redeemed = await redeemBenefit({ code: created.code, tenantId: tenant, tenantName: "A" });
    expect(redeemed.ok).toBe(true);

    const after = await db.orm.public.Tenant.where({ id: tenant }).first();
    expect(after?.plan).toBe("SIGNATURE");

    // Se acorta el período para simular que ya venció.
    const past = Temporal.Instant.fromEpochMilliseconds(Date.now() - 86_400_000);
    await db.orm.public.Subscription.where({ tenantId: tenant }).update({ currentPeriodEnd: past });

    await expireBenefitTrial(tenant);

    const reverted = await db.orm.public.Tenant.where({ id: tenant }).first();
    expect(reverted?.plan).toBe("ESSENTIAL");
    const sub = await db.orm.public.Subscription.where({ tenantId: tenant }).first();
    expect(sub?.status).toBe("ACTIVE");
    expect(sub?.plan).toBe("ESSENTIAL");
  });

  test("código a medida: suscripción activa con su precio, módulos exactos y límites", async () => {
    const suffix = Date.now().toString(36);
    const created = await createBenefitCode(
      {
        label: "Contrato Taller",
        code: `MEDIDA${suffix}`.toUpperCase(),
        plan: "ELITE",
        kind: "PAID",
        durationDays: 30,
        maxUses: 1,
        terms: { priceUsdCents: 2990, modules: ["crm", "finance"], maxUsers: 2, maxCustomers: 1 },
      },
      null,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    createdCodes.push(created.code);
    const tenant = await makeTenant(`medida-${suffix}`);

    const r = await redeemBenefit({ code: created.code, tenantId: tenant, tenantName: "Taller" });
    expect(r.ok).toBe(true);

    const sub = await db.orm.public.Subscription.where({ tenantId: tenant }).first();
    expect(sub?.status).toBe("ACTIVE");
    expect(sub?.priceUsdCents).toBe(2990);

    const t = await db.orm.public.Tenant.where({ id: tenant }).first();
    expect(t?.planMonthlyUsdCents).toBe(2990);
    expect(t?.maxUsers).toBe(2);
    expect(t?.maxCustomers).toBe(1);
    const active = (await db.orm.public.TenantModule.where({ tenantId: tenant, active: true }).all()).map((m) => m.moduleName).sort();
    expect(active).toEqual(["crm", "dashboard", "finance"]);

    const redemption = await db.orm.public.BenefitRedemption.where({ tenantId: tenant }).first();
    expect(redemption?.priceUsdCents).toBe(2990);

    // Un contrato con precio no es una prueba: no vence solo.
    await expireBenefitTrial(tenant);
    expect((await db.orm.public.Tenant.where({ id: tenant }).first())?.plan).toBe("ELITE");

    // Límites: usuarios y clientes acordados.
    expect((await seatLimit(tenant)).limit).toBe(2);
    const fields = { email: null, phone: null, documentId: null, birthDate: null, city: null, tags: [], profile: {} };
    expect((await saveCustomer(tenant, null, { name: "Primero", ...fields })).ok).toBe(true);
    const second = await saveCustomer(tenant, null, { name: "Segundo", ...fields });
    expect(second.ok).toBe(false);
  });
});
