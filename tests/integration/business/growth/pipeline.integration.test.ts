import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { createStage, deleteStage, setStageOrder } from "@/lib/business/growth/pipeline-config-db";
import { completeActivity, createQuickOpportunity, ensureStages, loadPipeline, loseWithReason, moveToStage, reopenOpportunity, scheduleActivity, updateOpportunity, winWithOrder } from "@/lib/business/growth/pipeline-db";

/** Pipeline del CRM de punta a punta contra la base de pruebas, y aislado por negocio. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("pipeline del CRM (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "CRM A", slug: `cra-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `cra-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "CRM B", slug: `crb-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `crb-${suffix}@ejemplo.com` })).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("dos cargas a la vez en un negocio nuevo dejan una sola vez cada etapa (una ganada)", async () => {
    await Promise.all([ensureStages(b), ensureStages(b), loadPipeline(b), loadPipeline(b)]);
    const stages = await ensureStages(b);
    expect(stages.map((s) => s.name)).toEqual(["Nuevo", "Calificado", "Propuesta", "Ganado"]);
    expect(stages.filter((s) => s.isWon)).toHaveLength(1);
    expect(await db.orm.public.CrmStage.where({ tenantId: b }).aggregate((x) => ({ n: x.count() }))).toEqual({ n: 4 });
  });

  test("etapas iniciales y motivos de pérdida al abrir el CRM", async () => {
    const stages = await ensureStages(a);
    expect(stages.map((s) => [s.name, s.probability, s.isWon])).toEqual([["Nuevo", 20, false], ["Calificado", 40, false], ["Propuesta", 60, false], ["Ganado", 100, true]]);
    expect((await loadPipeline(a)).reasons.length).toBeGreaterThan(0);
  });

  test("crear con cliente nuevo y luego con el mismo cliente existente no lo duplica", async () => {
    const first = await createQuickOpportunity(a, null, { name: "Uniformes · 200 camisetas", newCustomerName: "Colegio San José", phone: "300 123 4567", email: "compras@sanjose.edu.co", value: "4.800.000", priority: 2, activity: "CALL" });
    if (!first.ok) throw new Error(first.message);
    expect(first.customerId).toBeTruthy();
    // «Crear» con el mismo teléfono encuentra al cliente (como _find_matching_partner de Odoo).
    const again = await createQuickOpportunity(a, null, { name: "Dotación de invierno", newCustomerName: "Colegio San José", phone: "3001234567" });
    if (!again.ok) throw new Error(again.message);
    expect(again.customerId).toBe(first.customerId);
    // Elegir el cliente existente y escribir otro correo lo actualiza en el cliente (no se duplica en la oportunidad).
    const linked = await createQuickOpportunity(a, null, { name: "Chaquetas", customerId: first.customerId, email: "nuevo@sanjose.edu.co" });
    if (!linked.ok) throw new Error(linked.message);
    expect((await db.orm.public.Customer.where({ tenantId: a, id: first.customerId! }).select("email").first())?.email).toBe("nuevo@sanjose.edu.co");
    expect(await db.orm.public.Customer.where({ tenantId: a, name: "Colegio San José" }).aggregate((x) => ({ n: x.count() }))).toEqual({ n: 1 });

    const board = await loadPipeline(a);
    const card = board.cards.find((c) => c.id === first.id)!;
    expect(card).toMatchObject({ value: 4_800_000, probability: 20, priority: 2, customer: { name: "Colegio San José" } });
    expect(card.next?.kind).toBe("CALL");
    // Solo el nombre es obligatorio.
    expect(await createQuickOpportunity(a, null, { name: "Sin contacto aún" })).toMatchObject({ ok: true, customerId: null });
    expect(await createQuickOpportunity(a, null, { name: "" })).toMatchObject({ ok: false });
  });

  test("mover de etapa toma la probabilidad de la etapa y queda en el historial", async () => {
    const [nuevo, calificado] = await ensureStages(a);
    const r = await createQuickOpportunity(a, null, { name: "Plan corporativo · 15 socios", value: "3200000" });
    if (!r.ok) throw new Error(r.message);
    expect(await moveToStage(a, r.id, calificado!.id, null)).toMatchObject({ ok: true });
    const o = await db.orm.public.Opportunity.where({ tenantId: a, id: r.id }).first();
    expect(o).toMatchObject({ stageId: calificado!.id, probability: 40 });
    const events = await db.orm.public.OpportunityEvent.where({ tenantId: a, opportunityId: r.id }).orderBy((e) => e.createdAt.asc()).all();
    expect(events.map((e) => e.kind)).toEqual(["CREATED", "STAGE"]);
    expect(events[1]!.data).toMatchObject({ from: nuevo!.name, to: calificado!.name });
    // La probabilidad se puede editar después.
    expect(await updateOpportunity(a, r.id, { probability: 55 }, null)).toMatchObject({ ok: true });
  });

  test("ganar crea el pedido con el cliente y el valor, y deja el cobro abierto", async () => {
    const r = await createQuickOpportunity(a, null, { name: "Camisetas · torneo", newCustomerName: "Liga Deportiva", phone: "3105550101", value: "2800000" });
    if (!r.ok) throw new Error(r.message);
    const act = await scheduleActivity(a, r.id, { kind: "MEETING", dueAt: new Date(Date.now() + 86_400_000).toISOString() }, null);
    expect(act.ok).toBe(true);
    const won = await winWithOrder(a, r.id, null);
    if (!won.ok) throw new Error(won.message);
    const order = await db.orm.public.StoreOrder.where({ tenantId: a, id: won.orderId! }).first();
    expect(order).toMatchObject({ customerId: r.customerId, customerName: "Liga Deportiva" });
    expect(Number(order!.total)).toBe(2_800_000);
    expect(order!.origin).toMatchObject({ type: "opportunity", opportunityId: r.id });
    expect(await db.orm.public.Obligation.where({ tenantId: a, originId: won.orderId! }).select("id").first()).toBeTruthy();
    const o = await db.orm.public.Opportunity.where({ tenantId: a, id: r.id }).first();
    expect(o).toMatchObject({ status: "WON", probability: 100, orderId: won.orderId });
    expect(await db.orm.public.Customer.where({ tenantId: a, id: r.customerId! }).select("stage").first()).toMatchObject({ stage: "CUSTOMER" });
    expect(await db.orm.public.Task.where({ tenantId: a, opportunityId: r.id, status: "OPEN" }).select("id").first()).toBeNull();
    const card = (await loadPipeline(a)).cards.find((c) => c.id === r.id)!;
    expect(card).toMatchObject({ won: true, orderPaid: false });
    // Soltarla en la columna Ganado hace lo mismo; una ganada no se vuelve a ganar.
    expect(await winWithOrder(a, r.id, null)).toMatchObject({ ok: false });
  });

  test("perder con motivo la lleva a Perdidos y se puede reabrir", async () => {
    const r = await createQuickOpportunity(a, null, { name: "Visita guiada · grupo de 40", value: "1600000" });
    if (!r.ok) throw new Error(r.message);
    const { reasons } = await loadPipeline(a);
    expect(await loseWithReason(a, r.id, null, "", null)).toMatchObject({ ok: false });
    expect(await loseWithReason(a, r.id, reasons[0]!.id, "Pidió más tiempo", null)).toMatchObject({ ok: true });
    const lost = await loadPipeline(a);
    expect(lost.cards.some((c) => c.id === r.id)).toBe(false);
    expect(lost.lost.count).toBeGreaterThan(0);
    expect((await db.orm.public.Opportunity.where({ tenantId: a, id: r.id }).first())?.lostReason).toBe(`${reasons[0]!.name} · Pidió más tiempo`);
    expect(await reopenOpportunity(a, r.id, null)).toMatchObject({ ok: true });
    expect((await loadPipeline(a)).cards.find((c) => c.id === r.id)).toMatchObject({ won: false, probability: 20 });
  });

  test("hacer una actividad la saca de la tarjeta; nada se cruza entre negocios", async () => {
    const r = await createQuickOpportunity(a, null, { name: "Reposición · 120 polos", activity: "CALL" });
    if (!r.ok) throw new Error(r.message);
    const card = (await loadPipeline(a)).cards.find((c) => c.id === r.id)!;
    expect(await completeActivity(b, card.next!.id, null)).toMatchObject({ ok: false });
    expect(await completeActivity(a, card.next!.id, null)).toMatchObject({ ok: true });
    expect((await loadPipeline(a)).cards.find((c) => c.id === r.id)?.next).toBeNull();
    expect((await loadPipeline(b)).cards).toHaveLength(0);
    expect(await moveToStage(b, r.id, (await ensureStages(b))[1]!.id, null)).toMatchObject({ ok: false });
    expect(await winWithOrder(b, r.id, null)).toMatchObject({ ok: false });
  });

  test("crear una etapa la deja en su lugar, Ganado al final, sin tocar probabilidades existentes", async () => {
    const before = await ensureStages(a);
    const calificado = before.find((x) => x.name === "Calificado")!;
    const opp = await createQuickOpportunity(a, null, { name: "Probabilidad intacta" });
    if (!opp.ok) throw new Error(opp.message);
    expect(await createStage(a, "Negociación", 50, calificado.id)).toMatchObject({ ok: true });
    expect((await ensureStages(a)).map((x) => x.name)).toEqual(["Nuevo", "Calificado", "Negociación", "Propuesta", "Ganado"]);
    expect(await createStage(a, "negociación", 30)).toMatchObject({ ok: false, message: "Ya hay una etapa con ese nombre." });
    expect(await createStage(a, "", 30)).toMatchObject({ ok: false });
    expect((await db.orm.public.Opportunity.where({ tenantId: a, id: opp.id }).first())?.probability).toBe(20);
    // Reordenar con Ganado en medio: Ganado vuelve al final.
    const now = await ensureStages(a);
    const won = now.find((x) => x.isWon)!;
    const ids = now.filter((x) => !x.isWon).map((x) => x.id).reverse();
    await setStageOrder(a, [ids[0]!, won.id, ...ids.slice(1)]);
    expect((await ensureStages(a)).at(-1)?.name).toBe("Ganado");
    // Una etapa con oportunidades abiertas no se elimina; vacía, sí.
    const nuevo = (await ensureStages(a)).find((x) => x.name === "Nuevo")!;
    expect(await deleteStage(a, nuevo.id)).toMatchObject({ ok: false });
    const neg = (await ensureStages(a)).find((x) => x.name === "Negociación")!;
    expect(await deleteStage(a, neg.id)).toMatchObject({ ok: true });
  });
});
