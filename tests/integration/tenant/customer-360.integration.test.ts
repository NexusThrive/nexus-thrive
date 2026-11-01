/**
 * Ficha 360° (contrato G1): la base de Core más el aporte del gimnasio produce
 * exactamente lo mismo que producía `get360Details` cuando las membresías
 * estaban dentro de Core.
 *
 * `customer-360.golden.json` se capturó con la implementación ANTERIOR sobre
 * estos mismos datos (ids normalizados). Los instantes están fijados en el
 * pasado o en 2099, así que el estado de cada membresía no depende de «hoy».
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { buildCustomer360, createTenantDb } from "@/lib/tenant/db";
import { getCustomer360Memberships } from "@/lib/industry/gym/memberships-repo";

const TEST_URL = process.env.TEST_DATABASE_URL;
const at = (iso: string) => Temporal.Instant.from(iso);

describe.skipIf(!TEST_URL)("ficha 360° · base de Core + aporte del gimnasio (integración)", () => {
  let tenantId = "";
  const ids: Record<string, string> = {};
  const mk = async (name: string) => (await db.orm.public.Customer.create({ tenantId, name })).id;
  const pay = (customerId: string, amount: string, status: "APPROVED" | "PENDING", provider: "CASH" | "NEQUI" | "TRANSFER", createdAt: string, description?: string) =>
    db.orm.public.Payment.create({ tenantId, customerId, amount, status, provider, createdAt: at(createdAt), description });
  const mem = (customerId: string, type: "mensual" | "trimestral" | "anual", start: string, end: string, price: string, createdAt: string) =>
    db.orm.public.Membership.create({ tenantId, customerId, type, startDate: at(start), endDate: at(end), price, createdAt: at(createdAt) });
  const note = (customerId: string, content: string, createdAt: string) =>
    db.orm.public.CustomerNote.create({ tenantId, customerId, content, createdAt: at(createdAt) });

  beforeAll(async () => {
    tenantId = (await db.orm.public.Tenant.create({ name: "Tenant 360", slug: `test-360-${Date.now().toString(36)}`, vertical: "gym" })).id;
    ids.completo = await mk("Socio completo");
    await pay(ids.completo, "100000", "APPROVED", "CASH", "2026-03-01T15:00:00Z", "Mensualidad");
    await pay(ids.completo, "50000", "APPROVED", "NEQUI", "2026-04-01T15:00:00Z");
    await pay(ids.completo, "30000", "PENDING", "TRANSFER", "2026-05-01T15:00:00Z", "Pendiente");
    await mem(ids.completo, "mensual", "2026-01-01T05:00:00Z", "2026-02-01T05:00:00Z", "80000", "2026-01-01T05:00:00Z");
    await mem(ids.completo, "trimestral", "2026-06-01T05:00:00Z", "2099-01-01T05:00:00Z", "200000", "2026-06-01T05:00:00Z");
    await note(ids.completo, "Primera nota", "2026-03-15T12:00:00Z");
    await note(ids.completo, "x".repeat(200), "2026-07-01T12:00:00Z");
    ids.vacio = await mk("Socio vacío");
    ids.soloNotas = await mk("Solo notas");
    await note(ids.soloNotas, "Una nota", "2026-03-15T12:00:00Z");
    ids.soloVencida = await mk("Solo membresía vencida");
    await mem(ids.soloVencida, "mensual", "2026-01-01T05:00:00Z", "2026-02-01T05:00:00Z", "80000", "2026-01-01T05:00:00Z");
    ids.soloVigente = await mk("Solo membresía vigente");
    await mem(ids.soloVigente, "anual", "2026-06-01T05:00:00Z", "2099-01-01T05:00:00Z", "900000", "2026-06-01T05:00:00Z");
    ids.soloPendiente = await mk("Solo pago pendiente");
    await pay(ids.soloPendiente, "30000", "PENDING", "CASH", "2026-05-01T15:00:00Z");
    ids.soloAprobado = await mk("Solo pago aprobado");
    await pay(ids.soloAprobado, "70000", "APPROVED", "CASH", "2026-05-01T15:00:00Z");
    ids.muchos = await mk("Muchos eventos");
    for (let i = 0; i < 25; i++) await pay(ids.muchos, "1000", "APPROVED", "CASH", `2026-02-${String(i + 1).padStart(2, "0")}T15:00:00Z`);
    for (let i = 0; i < 8; i++) await note(ids.muchos, `nota ${i}`, `2026-08-${String(i + 1).padStart(2, "0")}T12:00:00Z`);
    await mem(ids.muchos, "mensual", "2026-09-01T05:00:00Z", "2099-01-01T05:00:00Z", "10000", "2026-09-01T05:00:00Z");
  });
  afterAll(async () => {
    if (tenantId) await db.orm.public.Tenant.where({ id: tenantId }).delete();
  });

  /** Misma composición que hace la página de la ficha. */
  async function compose(customerId: string) {
    const [base, gym] = await Promise.all([createTenantDb(tenantId).customers.get360Base(customerId), getCustomer360Memberships(tenantId, customerId)]);
    if (!base) return null;
    const { customer, payments, paymentsTotal, notes, timeline, metrics } = buildCustomer360(base, [gym.contribution]);
    // Mismo orden de claves que la salida anterior (los ids se numeran por orden de aparición).
    // createdAt/updatedAt del cliente son `now()` de la base: no son comportamiento.
    return { customer: { ...customer, createdAt: "<ts>", updatedAt: "<ts>" }, payments, paymentsTotal, memberships: gym.memberships, notes, timeline, metrics };
  }

  const golden = JSON.parse(readFileSync(join(import.meta.dirname, "customer-360.golden.json"), "utf8")) as Record<string, unknown>;

  test.each(Object.keys(golden).filter((k) => k !== "otroNegocio"))("%s: idéntica a la salida anterior", async (name) => {
    const seen = new Map<string, string>();
    const norm = (v: unknown): unknown =>
      JSON.parse(JSON.stringify(v), (k, val) => {
        if ((k === "id" || k.endsWith("Id")) && typeof val === "string") {
          if (!seen.has(val)) seen.set(val, `<id${seen.size + 1}>`);
          return seen.get(val);
        }
        if (typeof val === "string" && /^(payment|membership|note)-/.test(val)) {
          const [p, ...r] = val.split("-");
          const raw = r.join("-");
          if (!seen.has(raw)) seen.set(raw, `<id${seen.size + 1}>`);
          return `${p}-${seen.get(raw)}`;
        }
        return val;
      });
    // Los ids se numeran por orden de aparición: se recorren los clientes en el mismo orden que al capturar.
    for (const [n, id] of Object.entries(ids)) {
      const result = norm(await compose(id));
      if (n === name) {
        expect(result).toEqual(golden[name]);
        return;
      }
    }
  });

  test("un cliente de otro negocio devuelve null", async () => {
    expect(await createTenantDb(tenantId).customers.get360Base("00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(await compose("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  test("get360Details sin aportes es la ficha general, sin datos del gimnasio", async () => {
    const details = await createTenantDb(tenantId).customers.get360Details(ids.completo);
    expect(details).not.toBeNull();
    expect(details!.timeline.some((e) => e.type === "membership")).toBe(false);
    expect(details!.metrics.accountStatus).toBe("pendiente");
    expect("memberships" in details!).toBe(false);
  });
});
