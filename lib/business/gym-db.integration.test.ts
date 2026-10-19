import { beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { attendanceBetween, attendanceCount, cancelMembership, checkIn, ensureAccessCode, expiringSoon, findMemberByScan, freezeMembership, getMember, linkNfc, memberStatus, unfreezeMembership } from "./gym-db";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const DAY = 86_400_000;
const at = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);

describe.skipIf(!TEST_URL)("gimnasio: acceso, asistencia y congelamientos", () => {
  let tenantId: string;
  let otherTenantId: string;
  let ana: string;
  let beto: string;
  let anaMembership: string;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL mismatch");
    const suffix = Date.now().toString(36);
    tenantId = (await db.orm.public.Tenant.create({ name: "Gym Test", slug: `gym-${suffix}`, vertical: "gym" })).id;
    otherTenantId = (await db.orm.public.Tenant.create({ name: "Otro Gym", slug: `gym2-${suffix}`, vertical: "gym" })).id;
    ana = (await db.orm.public.Customer.create({ tenantId, name: "Ana Activa", documentId: "1010" })).id;
    beto = (await db.orm.public.Customer.create({ tenantId, name: "Beto Vencido" })).id;
    const now = Date.now();
    anaMembership = (await db.orm.public.Membership.create({ tenantId, customerId: ana, type: "mensual", startDate: at(now - 10 * DAY), endDate: at(now + 20 * DAY), status: "active", price: "100000.00" })).id;
    await db.orm.public.Membership.create({ tenantId, customerId: beto, type: "mensual", startDate: at(now - 40 * DAY), endDate: at(now - 2 * DAY), status: "expired", price: "100000.00" });
  });

  test("encuentra por código de acceso, NFC y documento; nunca en otro negocio", async () => {
    const code = await ensureAccessCode(tenantId, ana);
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    expect(await ensureAccessCode(tenantId, ana)).toBe(code);
    expect((await findMemberByScan(tenantId, ` ${code!.toLowerCase()} `))?.id).toBe(ana);
    expect(await linkNfc(tenantId, ana, "04:a2:3b:c1")).toEqual({ ok: true });
    expect((await findMemberByScan(tenantId, "04A23BC1"))?.id).toBe(ana);
    expect((await linkNfc(tenantId, beto, "04A23BC1")).ok).toBe(false);
    expect((await findMemberByScan(tenantId, "1010"))?.id).toBe(ana);
    expect(await findMemberByScan(otherTenantId, code!)).toBeNull();
    expect(await getMember(otherTenantId, ana)).toBeNull();
  });

  test("registra entradas permitidas y negadas", async () => {
    const a = await checkIn(tenantId, (await getMember(tenantId, ana))!, "QR", "u1");
    expect(a.allowed).toBe(true);
    const b = await checkIn(tenantId, (await getMember(tenantId, beto))!, "MANUAL", "u1");
    expect(b.allowed).toBe(false);
    expect(b.reason).toMatch(/vencida/);
    const now = Date.now();
    const rows = await attendanceBetween(tenantId, now - DAY, now + DAY);
    expect(rows.map((r) => r.name).sort()).toEqual(["Ana Activa", "Beto Vencido"]);
    expect(await attendanceCount(tenantId, now - DAY, now + DAY)).toEqual({ entries: 1, people: 1 });
  });

  test("congelar corre el vencimiento, niega la entrada y reactivar devuelve los días no usados", async () => {
    const before = await memberStatus(tenantId, ana);
    const r = await freezeMembership(tenantId, anaMembership, Date.now() - 1000, 10);
    expect(r.ok).toBe(true);
    const frozen = await memberStatus(tenantId, ana);
    expect(frozen.state).toBe("frozen");
    expect(frozen.endsAt! - before.endsAt!).toBe(10 * DAY);
    expect((await checkIn(tenantId, (await getMember(tenantId, ana))!, "QR", "u1")).allowed).toBe(false);
    expect((await unfreezeMembership(tenantId, anaMembership)).ok).toBe(true);
    const back = await memberStatus(tenantId, ana);
    expect(back.state).toBe("active");
    expect(Math.abs(back.endsAt! - before.endsAt!)).toBeLessThan(60_000);
  });

  test("vencimientos: incluye al vencido reciente y excluye canceladas", async () => {
    const soon = await expiringSoon(tenantId, 30, 7);
    expect(soon.map((s) => s.name)).toContain("Beto Vencido");
    expect(soon.find((s) => s.name === "Beto Vencido")!.daysLeft).toBeLessThanOrEqual(0);
    expect((await cancelMembership(tenantId, anaMembership, "Se mudó")).ok).toBe(true);
    expect((await cancelMembership(tenantId, anaMembership, "otra vez")).ok).toBe(false);
    expect((await memberStatus(tenantId, ana)).state).toBe("cancelled");
    expect((await expiringSoon(tenantId, 30, 7)).map((s) => s.name)).not.toContain("Ana Activa");
  });
});
