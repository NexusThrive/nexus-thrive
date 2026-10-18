"use server";

import { revalidatePath } from "next/cache";
import { canHandleCash } from "@/lib/business/roles";
import { checkIn, findMemberByScan, getMember, searchMembers, type CheckInResult, type MemberCard, type Method } from "@/lib/business/gym-db";
import { requireTenantContext } from "@/lib/tenant-context";

export type ScanResult = { ok: true; result: CheckInResult } | { ok: false; message: string };

const METHODS: Method[] = ["QR", "NFC", "MANUAL"];

/** Lectura en la puerta: QR, tarjeta NFC o documento. Registra la entrada aunque se niegue. */
export async function scanAction(slug: string, raw: string, method: Method): Promise<ScanResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx || !canHandleCash(ctx.role)) return { ok: false, message: "Tu rol no permite registrar entradas." };
  if (!METHODS.includes(method)) return { ok: false, message: "Método no válido." };
  const member = await findMemberByScan(ctx.tenantId, raw);
  if (!member) return { ok: false, message: "No se encontró ningún socio con ese código o tarjeta." };
  const result = await checkIn(ctx.tenantId, member, method, ctx.memberId);
  revalidatePath(`/${slug}/checkin`);
  revalidatePath(`/${slug}`);
  return { ok: true, result };
}

/** Entrada manual desde la búsqueda (el socio ya está identificado por su id). */
export async function manualCheckInAction(slug: string, customerId: string): Promise<ScanResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx || !canHandleCash(ctx.role)) return { ok: false, message: "Tu rol no permite registrar entradas." };
  const member = await getMember(ctx.tenantId, customerId);
  if (!member) return { ok: false, message: "El socio no es de este negocio." };
  const result = await checkIn(ctx.tenantId, member, "MANUAL", ctx.memberId);
  revalidatePath(`/${slug}/checkin`);
  revalidatePath(`/${slug}`);
  return { ok: true, result };
}

export async function searchMembersAction(slug: string, q: string): Promise<MemberCard[]> {
  const ctx = await requireTenantContext(slug);
  return ctx ? searchMembers(ctx.tenantId, q) : [];
}

