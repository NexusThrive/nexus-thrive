"use server";

import { revalidatePath } from "next/cache";
import { canHandleCash } from "@/lib/business/roles";
import { checkIn, findMemberByScan, getMember, recordUnknownScan, searchMembers, type CheckInResult, type MemberCard, type Method } from "@/lib/business/gym-db";
import { allowAttempt, recordAttempt } from "@/lib/rate-limit";
import { requireTenantContext } from "@/lib/tenant/context";

export type ScanResult = { ok: true; result: CheckInResult } | { ok: false; message: string };

const METHODS: Method[] = ["QR", "NFC", "MANUAL"];

/** Tope de escaneos por persona y minuto (frena a quien prueba códigos). */
const SCAN_LIMIT = 120;

/** Lectura en la puerta: QR, tarjeta NFC o documento. Registra la entrada aunque se niegue. */
export async function scanAction(slug: string, raw: string, method: Method): Promise<ScanResult> {
  const ctx = await requireTenantContext(slug, "/checkin");
  if (!ctx || !canHandleCash(ctx.role)) return { ok: false, message: "Tu rol no permite registrar entradas." };
  if (!METHODS.includes(method)) return { ok: false, message: "Método no válido." };

  const key = `checkin-scan:${ctx.memberId}`;
  if (!allowAttempt(key, SCAN_LIMIT)) {
    return { ok: false, message: "Demasiados escaneos seguidos. Espera un momento." };
  }
  recordAttempt(key, SCAN_LIMIT);

  const member = await findMemberByScan(ctx.tenantId, raw);
  if (!member) {
    // Queda registrado: si alguien prueba códigos o clona una tarjeta, se ve.
    await recordUnknownScan(ctx.tenantId, raw, method, ctx.memberId);
    revalidatePath(`/${slug}/checkin`);
    return { ok: false, message: "No se encontró ningún socio con ese código o tarjeta." };
  }
  const result = await checkIn(ctx.tenantId, member, method, ctx.memberId);
  revalidatePath(`/${slug}/checkin`);
  revalidatePath(`/${slug}`);
  return { ok: true, result };
}

/** Entrada manual desde la búsqueda (el socio ya está identificado por su id). */
export async function manualCheckInAction(slug: string, customerId: string): Promise<ScanResult> {
  const ctx = await requireTenantContext(slug, "/checkin");
  if (!ctx || !canHandleCash(ctx.role)) return { ok: false, message: "Tu rol no permite registrar entradas." };
  const member = await getMember(ctx.tenantId, customerId);
  if (!member) return { ok: false, message: "El socio no es de este negocio." };
  const result = await checkIn(ctx.tenantId, member, "MANUAL", ctx.memberId);
  revalidatePath(`/${slug}/checkin`);
  revalidatePath(`/${slug}`);
  return { ok: true, result };
}

export async function searchMembersAction(slug: string, q: string): Promise<MemberCard[]> {
  const ctx = await requireTenantContext(slug, "/checkin");
  return ctx ? searchMembers(ctx.tenantId, q) : [];
}

