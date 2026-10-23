import { and, not, or } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { escapeLike } from "@/lib/construction/shared";
import { isUniqueViolation } from "@/lib/db-errors";
import { toNumber } from "@/lib/format";
import { accessCode, checkAccess, currentMembership, freezePlan, membershipState, type AccessResult, type MembershipLike } from "./gym";

/**
 * Gimnasio (servidor, aislado por tenant): identificar al socio en la puerta,
 * registrar la entrada con su resultado, congelar/cancelar membresías y
 * listar lo que vence pronto.
 */

const DAY = 86_400_000;
const instant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);
const ms = (v: unknown) => (v == null ? null : Date.parse(String(v)));

export type Method = "QR" | "NFC" | "MANUAL";

export type MemberCard = { id: string; name: string; phone: string | null; documentId: string | null; photoId: string | null; accessCode: string | null; nfcUid: string | null };

const MEMBER_FIELDS = ["id", "name", "phone", "documentId", "photoId", "accessCode", "nfcUid"] as const;

/** Normaliza lo que entrega un lector (QR, NFC o teclado): sin espacios, en mayúsculas. */
export function normalizeScan(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase().slice(0, 64);
}

/** Busca por código de acceso, UID de tarjeta NFC o documento (coincidencia exacta). */
export async function findMemberByScan(tenantId: string, raw: string): Promise<MemberCard | null> {
  const code = normalizeScan(raw);  if (code.length < 4) return null;
  const nfc = code.replace(/:/g, "");
  const row = await db.orm.public.Customer.where({ tenantId, active: true })
    .where((c) => or(c.accessCode.eq(code), c.nfcUid.eq(nfc), c.documentId.eq(raw.trim())))
    .select(...MEMBER_FIELDS)
    .first();
  return row ?? null;
}

export async function getMember(tenantId: string, id: string): Promise<MemberCard | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await db.orm.public.Customer.where({ tenantId, id, active: true }).select(...MEMBER_FIELDS).first()) ?? null;
}

/** Búsqueda manual por nombre, teléfono o documento (máx. 8). */
export async function searchMembers(tenantId: string, q: string): Promise<MemberCard[]> {
  const text = q.trim();
  if (text.length < 2) return [];
  const pattern = `%${escapeLike(text)}%`;
  return db.orm.public.Customer.where({ tenantId, active: true })
    .where((c) => or(c.name.ilike(pattern), c.phone.ilike(pattern), c.documentId.ilike(pattern)))
    .orderBy((c) => c.name.asc())
    .select(...MEMBER_FIELDS)
    .limit(8)
    .all();
}

async function membershipsOf(tenantId: string, customerId: string) {
  const rows = await db.orm.public.Membership.where({ tenantId, customerId })
    .select("id", "startDate", "endDate", "frozenFrom", "frozenUntil", "cancelledAt", "type", "price")
    .all();
  return rows.map((r) => ({
    id: r.id,
    start: ms(r.startDate)!,
    end: ms(r.endDate)!,
    frozenFrom: ms(r.frozenFrom),
    frozenUntil: ms(r.frozenUntil),
    cancelledAt: ms(r.cancelledAt),
    type: r.type,
    price: toNumber(r.price),
  }));
}

export type CheckInResult = AccessResult & { member: MemberCard; endsAt: number | null; at: string };

/** Registra la entrada (permitida o negada) y devuelve el motivo y la vigencia. */
export async function checkIn(tenantId: string, member: MemberCard, method: Method, userId: string): Promise<CheckInResult> {
  const now = Date.now();
  const list = await membershipsOf(tenantId, member.id);
  const result = checkAccess(list, now);
  const row = await db.orm.public.Attendance.create({
    tenantId,
    customerId: member.id,
    membershipId: result.membershipId,
    method,
    allowed: result.allowed,
    reason: result.reason.slice(0, 200),
    createdById: userId,
  });
  const m = list.find((x) => x.id === result.membershipId);
  return { ...result, member, endsAt: m?.end ?? null, at: String(row.at) };
}

export type AttendanceRow = { id: string; customerId: string; name: string; photoId: string | null; method: string; allowed: boolean; reason: string | null; at: string };

/**
 * Registra un escaneo que NO corresponde a ningún socio (código o tarjeta
 * desconocida). Antes estos intentos no dejaban rastro: no había forma de ver
 * que alguien estaba probando códigos o clonando una tarjeta. Ahora quedan en
 * la misma tabla de asistencia, con el socio vacío y lo escaneado guardado.
 */
export async function recordUnknownScan(
  tenantId: string,
  raw: string,
  method: Method,
  userId: string,
): Promise<void> {
  const scanned = normalizeScan(raw).slice(0, 64);
  if (!scanned) return;
  try {
    await db.orm.public.Attendance.create({
      tenantId,
      customerId: null,
      membershipId: null,
      scanned,
      method,
      allowed: false,
      reason: "Código o tarjeta desconocida",
      createdById: userId,
    });
  } catch {
    // Registrar el intento nunca debe tumbar la puerta.
  }
}

/** Intentos fallidos (nadie identificado) en un rango: lo que se ve en el panel. */
export async function unknownScansBetween(tenantId: string, fromMs: number, toMs: number): Promise<number> {
  const { total } = await db.orm.public.Attendance
    .where({ tenantId, allowed: false })
    .where((a) => and(a.customerId.eq(null), a.at.gte(instant(fromMs)), a.at.lt(instant(toMs))))
    .aggregate((a) => ({ total: a.count() }));
  return total;
}

/** Entradas de un rango (por defecto, hoy en Bogotá), la más reciente primero. */
export async function attendanceBetween(tenantId: string, fromMs: number, toMs: number, limit = 60): Promise<AttendanceRow[]> {
  const rows = await db.orm.public.Attendance.where({ tenantId })
    .where((a) => and(not(a.customerId.eq(null)), a.at.gte(instant(fromMs)), a.at.lt(instant(toMs))))
    .orderBy((a) => a.at.desc())
    .limit(limit)
    .all();
  const ids = [...new Set(rows.map((r) => r.customerId).filter((id): id is string => Boolean(id)))];
  const people = ids.length
    ? await db.orm.public.Customer.where({ tenantId })
        .where((c) => c.id.in(ids))
        .select("id", "name", "photoId")
        .all()
    : [];
  const byId = new Map(people.map((p) => [p.id, p]));
  return rows.map((r) => ({ id: r.id, customerId: r.customerId ?? "", name: byId.get(r.customerId ?? "")?.name ?? "Socio", photoId: byId.get(r.customerId ?? "")?.photoId ?? null, method: r.method, allowed: r.allowed, reason: r.reason, at: String(r.at) }));
}

/** Conteo de entradas permitidas en un rango (personas distintas y total). */
export async function attendanceCount(tenantId: string, fromMs: number, toMs: number): Promise<{ entries: number; people: number }> {
  const rows = await db.orm.public.Attendance.where({ tenantId, allowed: true })
    .where((a) => and(a.at.gte(instant(fromMs)), a.at.lt(instant(toMs))))
    .select("customerId")
    .all();
  return { entries: rows.length, people: new Set(rows.map((r) => r.customerId)).size };
}

/** Asegura que el socio tenga código de acceso (o lo cambia si `regenerate`). */
export async function ensureAccessCode(tenantId: string, customerId: string, regenerate = false): Promise<string | null> {
  const c = await db.orm.public.Customer.where({ tenantId, id: customerId }).select("accessCode").first();
  if (!c) return null;
  if (c.accessCode && !regenerate) return c.accessCode;
  for (let i = 0; i < 5; i++) {
    const code = accessCode();
    const clash = await db.orm.public.Customer.where({ tenantId, accessCode: code }).select("id").first();
    if (clash) continue;
    try {
      await db.orm.public.Customer.where({ tenantId, id: customerId }).update({ accessCode: code });
    } catch (error) {
      // Otro socio lo tomó entre la lectura y la escritura: se prueba otro.
      if (isUniqueViolation(error)) continue;
      throw error;
    }
    return code;
  }
  throw new Error("No se pudo generar el código.");
}

/** Vincula (o quita, con null) la tarjeta NFC. Una tarjeta no puede ser de dos socios. */
export async function linkNfc(tenantId: string, customerId: string, uid: string | null): Promise<{ ok: true } | { ok: false; message: string }> {
  const clean = uid ? normalizeScan(uid).replace(/:/g, "") : null;
  if (clean && !/^[0-9A-F]{6,32}$/.test(clean)) return { ok: false, message: "El código de la tarjeta no es válido." };
  if (clean) {
    const other = await db.orm.public.Customer.where({ tenantId, nfcUid: clean }).select("id", "name").first();
    if (other && other.id !== customerId) return { ok: false, message: `Esa tarjeta ya es de ${other.name}.` };
  }
  try {
    await db.orm.public.Customer.where({ tenantId, id: customerId }).update({ nfcUid: clean });
  } catch (error) {
    // Dos vínculos a la vez de la misma tarjeta: la base deja pasar uno (DATA-04).
    if (isUniqueViolation(error)) return { ok: false, message: "Esa tarjeta ya es de otro socio." };
    throw error;
  }
  return { ok: true };
}

function asLike(r: { id: string; startDate: unknown; endDate: unknown; frozenFrom: unknown; frozenUntil: unknown; cancelledAt: unknown }): MembershipLike {
  return { id: r.id, start: ms(r.startDate)!, end: ms(r.endDate)!, frozenFrom: ms(r.frozenFrom), frozenUntil: ms(r.frozenUntil), cancelledAt: ms(r.cancelledAt) };
}

/** Congela N días desde `fromMs`: el vencimiento se corre esos mismos días. */
export async function freezeMembership(tenantId: string, id: string, fromMs: number, days: number) {
  const r = await db.orm.public.Membership.where({ tenantId, id }).first();
  if (!r) return { ok: false as const, message: "La membresía no existe." };
  const plan = freezePlan(asLike(r), fromMs, days, Date.now());
  if (!plan.ok) return plan;
  await db.orm.public.Membership.where({ tenantId, id }).update({ frozenFrom: instant(plan.frozenFrom), frozenUntil: instant(plan.frozenUntil), endDate: instant(plan.newEnd) });
  return { ok: true as const, newEnd: plan.newEnd };
}

/** Quita el congelamiento: devuelve al vencimiento los días que no se usaron. */
export async function unfreezeMembership(tenantId: string, id: string) {
  const r = await db.orm.public.Membership.where({ tenantId, id }).first();
  if (!r || r.frozenFrom == null || r.frozenUntil == null) return { ok: false as const, message: "La membresía no está congelada." };
  const now = Date.now();
  const until = ms(r.frozenUntil)!;
  const from = ms(r.frozenFrom)!;
  const unused = Math.max(0, until - Math.max(now, from));
  await db.orm.public.Membership.where({ tenantId, id }).update({ frozenUntil: instant(Math.max(from, Math.min(now, until))), endDate: instant(ms(r.endDate)! - unused) });
  return { ok: true as const };
}

export async function cancelMembership(tenantId: string, id: string, reason: string) {
  const r = await db.orm.public.Membership.where({ tenantId, id }).select("cancelledAt").first();
  if (!r) return { ok: false as const, message: "La membresía no existe." };
  if (r.cancelledAt) return { ok: false as const, message: "Ya estaba cancelada." };
  await db.orm.public.Membership.where({ tenantId, id }).update({ cancelledAt: instant(Date.now()), cancelReason: reason.slice(0, 200) });
  return { ok: true as const };
}

export type ExpiringRow = { membershipId: string; customerId: string; name: string; phone: string | null; endsAt: string; daysLeft: number; type: string; price: number };

/** Membresías vigentes (no canceladas) que vencen en los próximos `days` días, o que vencieron hace menos de `gone` días. */
export async function expiringSoon(tenantId: string, days = 7, gone = 7): Promise<ExpiringRow[]> {
  const now = Date.now();
  const rows = await db.orm.public.Membership.where({ tenantId })
    .where((m) => and(m.endDate.gt(instant(now - gone * DAY)), m.endDate.lte(instant(now + days * DAY))))
    .include("customer", (c) => c.select("name", "phone"))
    .orderBy((m) => m.endDate.asc())
    .limit(50)
    .all();
  // Si el socio ya renovó (otra membresía que vence después), no se avisa.
  const later = new Set(
    (
      await db.orm.public.Membership.where({ tenantId })
        .where((m) => m.endDate.gt(instant(now + days * DAY)))
        .select("customerId")
        .all()
    ).map((r) => r.customerId),
  );
  return rows
    .filter((r) => !r.cancelledAt && !later.has(r.customerId))
    .map((r) => {
      const end = ms(r.endDate)!;
      return { membershipId: r.id, customerId: r.customerId, name: r.customer?.name ?? "Socio", phone: r.customer?.phone ?? null, endsAt: String(r.endDate), daysLeft: Math.ceil((end - now) / DAY), type: r.type, price: toNumber(r.price) };
    });
}

export type MemberStatus = { state: ReturnType<typeof membershipState> | "none"; membershipId: string | null; endsAt: number | null; frozenUntil: number | null };

/** Estado de la membresía que cuenta para entrar (para la ficha del socio). */
export async function memberStatus(tenantId: string, customerId: string): Promise<MemberStatus> {
  const list = await membershipsOf(tenantId, customerId);
  const now = Date.now();
  const m = currentMembership(list, now);
  if (!m) return { state: "none", membershipId: null, endsAt: null, frozenUntil: null };
  return { state: membershipState(m, now), membershipId: m.id, endsAt: m.end, frozenUntil: m.frozenUntil };
}
