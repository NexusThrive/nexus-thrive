import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { confirmIntent, createIntent, listIntents, publicIntent, rejectProof, submitProof } from "@/lib/domains/finance/payments/intents-db";

/** HU-verificacion-01: un comprobante no marca el pago como recibido; solo una confirmación autorizada lo hace. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("transferencia en verificación (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const mk = async (tenant: string, description = "Plan trimestral") => {
    const r = await createIntent(tenant, { amount: 120_000, description }, "u");
    if (!r.ok) throw new Error(r.message);
    return r;
  };
  const payments = (tenant: string) => db.orm.public.Payment.where({ tenantId: tenant }).all();

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Verificación A", slug: `va-${suffix}`, vertical: "retail", modules: ["payments"], tenantType: "COMPANY", ownerEmail: `va-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Verificación B", slug: `vb-${suffix}`, vertical: "retail", modules: ["payments"], tenantType: "COMPANY", ownerEmail: `vb-${suffix}@ejemplo.com` })).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("avisar un comprobante pasa a «en verificación» y NO registra ningún ingreso", async () => {
    const intent = await mk(a);
    expect(await submitProof(intent.reference, "ab")).toMatchObject({ ok: false });
    expect(await submitProof(intent.reference, "Bancolombia 88231")).toEqual({ ok: true });
    const row = (await listIntents(a)).find((i) => i.id === intent.id)!;
    expect(row).toMatchObject({ status: "VERIFYING", proofNote: "Bancolombia 88231" });
    expect(row.proofAt).toBeTruthy();
    expect(await payments(a)).toHaveLength(0);
    expect((await publicIntent(intent.reference))?.status).toBe("VERIFYING");
    // No se puede avisar dos veces ni sobre un enlace que no existe.
    expect(await submitProof(intent.reference, "Otra referencia 1")).toMatchObject({ ok: false });
    expect(await submitProof("zzzzzzzzzzzzzz", "Bancolombia 88231")).toMatchObject({ ok: false });
  });

  test("confirmar un cobro en verificación lo paga una sola vez", async () => {
    const intent = await mk(a, "Se confirma");
    await submitProof(intent.reference, "Davivienda 5531");
    const ok = await confirmIntent(a, intent.reference, { kind: "MANUAL", evidence: "Visto en el banco 5531", userId: "u" });
    expect(ok).toEqual({ ok: true, already: false });
    expect((await confirmIntent(a, intent.reference, { kind: "MANUAL", evidence: "Visto en el banco 5531", userId: "u" }))).toEqual({ ok: true, already: true });
    expect((await payments(a)).filter((p) => p.description?.includes("Se confirma"))).toHaveLength(1);
    expect((await listIntents(a)).find((i) => i.id === intent.id)?.status).toBe("PAID");
  });

  test("rechazar el comprobante pide motivo, devuelve el cobro a pendiente y no cruza negocios", async () => {
    const intent = await mk(a, "Se rechaza");
    await submitProof(intent.reference, "Nequi 9981");
    expect(await rejectProof(a, intent.id, " ")).toMatchObject({ ok: false });
    expect(await rejectProof(b, intent.id, "El monto no coincide")).toMatchObject({ ok: false });
    expect(await rejectProof(a, intent.id, "El monto no coincide")).toEqual({ ok: true });
    expect((await listIntents(a)).find((i) => i.id === intent.id)).toMatchObject({ status: "PENDING", rejectionReason: "El monto no coincide" });
    expect(await rejectProof(a, intent.id, "Otra vez")).toMatchObject({ ok: false });
    expect(await submitProof(intent.reference, "Nequi 9982")).toEqual({ ok: true });
    expect((await listIntents(a)).find((i) => i.id === intent.id)?.rejectionReason).toBeNull();
  });

  test("un cobro pagado o cancelado no admite aviso", async () => {
    const paid = await mk(a, "Ya pagado");
    await confirmIntent(a, paid.reference, { kind: "MANUAL", evidence: "Transferencia 7788", userId: "u" });
    expect(await submitProof(paid.reference, "Bancolombia 88231")).toMatchObject({ ok: false });
  });
});
