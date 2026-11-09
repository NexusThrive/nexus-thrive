import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { addDeliverableFile, createDeliverable, decideDeliverable, getForReview, listDeliverables, readReviewFile, sendForReview } from "@/lib/business/customers/deliverables-db";

/** HU-entregables-01: el cliente externo aprueba o pide cambios con un enlace de un solo propósito. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const png = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "logo.png", { type: "image/png" });

describe.skipIf(!TEST_URL)("entregables (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let customerId = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Entrega A", slug: `ea-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `ea-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Entrega B", slug: `eb-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `eb-${suffix}@ejemplo.com` })).id);
    customerId = (await db.orm.public.Customer.create({ tenantId: a, name: "Camila" })).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  const draft = async (title = "Logo final") => {
    const r = await createDeliverable(a, { title, customerId }, "u");
    if (!r.ok) throw new Error(r.message);
    return r.id;
  };

  test("no se envía sin archivos; con archivo, el cliente ve solo lo suyo y aprueba una sola vez", async () => {
    const id = await draft();
    expect(await sendForReview(a, id)).toMatchObject({ ok: false, message: expect.stringContaining("al menos un archivo") });
    expect(await addDeliverableFile(a, id, png(), "u")).toEqual({ ok: true });
    expect(await addDeliverableFile(a, id, new File(["x"], "virus.exe", { type: "application/x-msdownload" }), "u")).toMatchObject({ ok: false });
    const sent = await sendForReview(a, id);
    if (!sent.ok) throw new Error(sent.message);
    expect(await sendForReview(a, id)).toMatchObject({ ok: false });
    expect(await addDeliverableFile(a, id, png(), "u")).toMatchObject({ ok: false });

    const view = await getForReview(sent.token);
    expect(view).toMatchObject({ title: "Logo final", status: "IN_REVIEW", businessName: "Entrega A", files: [expect.objectContaining({ fileName: "logo.png" })] });
    const file = await readReviewFile(sent.token, view!.files[0]!.id);
    expect(file?.fileName).toBe("logo.png");
    // El enlace en claro no se guarda.
    expect((await db.orm.public.Deliverable.where({ tenantId: a, id }).first())?.reviewTokenHash).not.toBe(sent.token);

    expect(await decideDeliverable(sent.token, { decision: "APPROVED", name: "", comment: "" })).toMatchObject({ ok: false, field: "name" });
    const [x, y] = await Promise.all([decideDeliverable(sent.token, { decision: "APPROVED", name: "Camila Torres", comment: "" }), decideDeliverable(sent.token, { decision: "APPROVED", name: "Camila Torres", comment: "" })]);
    expect([x, y].filter((r) => r.ok)).toHaveLength(1);
    const row = (await listDeliverables(a)).find((r) => r.id === id)!;
    expect(row).toMatchObject({ status: "APPROVED", decidedByName: "Camila Torres", customerName: "Camila" });
    expect(row.decidedAt).toBeTruthy();
    expect(await sendForReview(a, id)).toMatchObject({ ok: false, message: "Este entregable ya fue aprobado." });
  });

  test("pedir cambios exige el motivo y permite reenviar con un enlace nuevo; el viejo ya no sirve", async () => {
    const id = await draft("Banner");
    await addDeliverableFile(a, id, png(), "u");
    const first = await sendForReview(a, id);
    if (!first.ok) throw new Error(first.message);
    expect(await decideDeliverable(first.token, { decision: "CHANGES_REQUESTED", name: "Camila", comment: "" })).toMatchObject({ ok: false, field: "comment" });
    expect(await decideDeliverable(first.token, { decision: "CHANGES_REQUESTED", name: "Camila", comment: "Más grande el logo" })).toMatchObject({ ok: true, status: "CHANGES_REQUESTED" });
    const second = await sendForReview(a, id);
    if (!second.ok) throw new Error(second.message);
    expect(second.token).not.toBe(first.token);
    expect(await getForReview(first.token)).toBeNull();
    expect(await getForReview(second.token)).toMatchObject({ status: "IN_REVIEW", clientComment: null });
  });

  test("enlace inexistente, mal formado o caducado no revela nada; y no cruza de negocio", async () => {
    const id = await draft("Caduca");
    await addDeliverableFile(a, id, png(), "u");
    const sent = await sendForReview(a, id);
    if (!sent.ok) throw new Error(sent.message);
    expect(await getForReview("basura")).toBeNull();
    expect(await getForReview("A".repeat(43))).toBeNull();
    const later = Date.now() + 31 * 86_400_000;
    expect(await getForReview(sent.token, later)).toBeNull();
    expect(await decideDeliverable(sent.token, { decision: "APPROVED", name: "Camila", comment: "" }, later)).toMatchObject({ ok: false, message: "Este enlace no existe o ya caducó." });
    expect(await readReviewFile(sent.token, "00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(await listDeliverables(b)).toEqual([]);
    expect(await sendForReview(b, id)).toMatchObject({ ok: false, message: "No se encontró el entregable." });
    expect(await createDeliverable(b, { title: "Ajeno", customerId }, "u")).toMatchObject({ ok: false });
  });
});
