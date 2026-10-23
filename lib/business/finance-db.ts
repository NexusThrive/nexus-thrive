import { createHash, createHmac } from "node:crypto";
import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import { expectedCash, type CashKind } from "./cash";

/**
 * Dinero del negocio (servidor, aislado por tenant): recibos consecutivos,
 * anulaciones, gastos con soporte, caja menor por turnos y archivos.
 */

const now = () => Temporal.Instant.fromEpochMilliseconds(Date.now());
/** Decimal de Prisma 8 = texto con 2 decimales. */
const dec = (n: number) => n.toFixed(2);
const isUnique = (e: unknown) => /unique|duplicate/i.test(String((e as Error)?.message ?? e));

/** Siguiente número libre: max + 1 con reintento si dos chocan (restricción única). */
export async function withNextNumber<T>(current: () => Promise<number | null>, write: (n: number) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const n = ((await current()) ?? 0) + 1;
    try {
      return await write(n);
    } catch (e) {
      if (attempt === 5 || !isUnique(e)) throw e;
    }
  }
  throw new Error("No se pudo numerar.");
}

// --- Archivos ---------------------------------------------------------------

export const ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const ATTACHMENT_MAX = 8 * 1024 * 1024;

export function checkAttachment(f: { type: string; size: number }): string | null {
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(f.type)) return "El archivo debe ser PDF, JPG, PNG o WEBP.";
  if (f.size <= 0) return "El archivo está vacío.";
  if (f.size > ATTACHMENT_MAX) return "El archivo supera 8 MB.";
  return null;
}

export async function addAttachment(tenantId: string, kind: string, ownerId: string, file: File, userId: string | null) {
  const err = checkAttachment(file);
  if (err) throw new Error(err);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const row = await db.orm.public.Attachment.create({
    tenantId,
    kind,
    ownerId,
    fileName: file.name.slice(0, 160) || "archivo",
    mimeType: file.type,
    byteSize: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    data: bytes,
    uploadedById: userId,
  });
  return row.id;
}

export async function listAttachments(tenantId: string, kind: string, ownerIds: string[]) {
  if (!ownerIds.length) return [];
  const rows = await db.orm.public.Attachment.where({ tenantId, kind })
    .where((a) => a.ownerId.in(ownerIds))
    .select("id", "ownerId", "fileName", "mimeType", "byteSize", "createdAt")
    .orderBy((a) => a.createdAt.asc())
    .all();
  return rows.map((r) => ({ id: r.id, ownerId: r.ownerId, fileName: r.fileName, mimeType: r.mimeType, byteSize: r.byteSize, createdAt: String(r.createdAt) }));
}

export async function getAttachment(tenantId: string, id: string) {
  return db.orm.public.Attachment.where({ tenantId, id }).select("fileName", "mimeType", "sha256", "data", "kind").first();
}

// --- Recibos ----------------------------------------------------------------

/** Asigna el siguiente número de recibo del negocio a un pago. */
export async function assignReceiptNumber(tenantId: string, paymentId: string): Promise<number> {
  return withNextNumber(
    async () => (await db.orm.public.Payment.where({ tenantId }).aggregate((a) => ({ top: a.max("receiptNumber") }))).top,
    async (n) => {
      await db.orm.public.Payment.where({ tenantId, id: paymentId }).update({ receiptNumber: n });
      return n;
    },
  );
}

/** Firma del enlace público del recibo (sin guardar tokens). */
function receiptSecret() {
  const s = process.env.RECEIPT_LINK_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!s) throw new Error("Falta RECEIPT_LINK_SECRET.");
  return s;
}

export function receiptToken(paymentId: string) {
  const sig = createHmac("sha256", receiptSecret()).update(`receipt:${paymentId}`).digest("base64url").slice(0, 22);
  return `${paymentId}.${sig}`;
}

export function verifyReceiptToken(token: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return receiptToken(id) === token ? id : null;
}

/**
 * Anula un pago (no se borra), una sola vez. Si entró en efectivo a una caja
 * abierta, la caja lo devuelve. Transaccional: ver `lib/business/money-service.ts`.
 */
export { voidPayment } from "./money-service";

// --- Caja menor ---------------------------------------------------------------

export type CashBoxRow = { id: string; name: string; fundAmount: number; responsibleUserId: string | null; active: boolean; openSession: { id: string; openedAt: string; openingAmount: number; expected: number } | null };

export async function listCashBoxes(tenantId: string): Promise<CashBoxRow[]> {
  const boxes = await db.orm.public.CashBox.where({ tenantId, active: true }).orderBy((b) => b.createdAt.asc()).all();
  const open = boxes.length
    ? await db.orm.public.CashSession.where({ tenantId })
        .where((s) => s.boxId.in(boxes.map((b) => b.id)))
        .where((s) => s.closedAt.isNull())
        .all()
    : [];
  const result: CashBoxRow[] = [];
  for (const b of boxes) {
    const s = open.find((x) => x.boxId === b.id) ?? null;
    let expected = 0;
    if (s) {
      const moves = await db.orm.public.CashMovement.where({ tenantId, sessionId: s.id }).select("kind", "amount").all();
      expected = expectedCash(moves.map((m) => ({ kind: m.kind as CashKind, amount: toNumber(m.amount) })));
    }
    result.push({ id: b.id, name: b.name, fundAmount: toNumber(b.fundAmount), responsibleUserId: b.responsibleUserId, active: b.active, openSession: s ? { id: s.id, openedAt: String(s.openedAt), openingAmount: toNumber(s.openingAmount), expected } : null });
  }
  return result;
}

export async function createCashBox(tenantId: string, name: string, fundAmount: number, responsibleUserId: string | null) {
  return (await db.orm.public.CashBox.create({ tenantId, name, fundAmount: dec(fundAmount), responsibleUserId })).id;
}

export async function updateCashBox(tenantId: string, id: string, fields: { name?: string; fundAmount?: number; responsibleUserId?: string | null; active?: boolean }) {
  const { fundAmount, ...rest } = fields;
  await db.orm.public.CashBox.where({ tenantId, id }).update({ ...rest, ...(fundAmount != null ? { fundAmount: dec(fundAmount) } : {}) });
}

/** Turno abierto de la caja principal (la primera activa). */
export async function currentCashSession(tenantId: string) {
  const boxes = await listCashBoxes(tenantId);
  const box = boxes.find((b) => b.openSession) ?? null;
  return box ? { boxId: box.id, sessionId: box.openSession!.id, available: box.openSession!.expected } : null;
}

export async function openCashSession(tenantId: string, boxId: string, openingAmount: number, userId: string) {
  const already = await db.orm.public.CashSession.where({ tenantId, boxId }).where((s) => s.closedAt.isNull()).select("id").first();
  if (already) return { ok: false as const, message: "La caja ya tiene un turno abierto." };
  const s = await db.orm.public.CashSession.create({ tenantId, boxId, openedById: userId, openingAmount: dec(openingAmount) });
  await db.orm.public.CashMovement.create({ tenantId, sessionId: s.id, kind: "OPENING", amount: dec(openingAmount), description: "Apertura de caja", createdById: userId });
  return { ok: true as const, id: s.id };
}

export async function addCashMovement(tenantId: string, m: { sessionId: string; kind: CashKind; amount: number; description: string; beneficiary?: string | null; paymentId?: string | null; expenseId?: string | null }, userId: string) {
  await db.orm.public.CashMovement.create({ tenantId, ...m, amount: dec(m.amount), beneficiary: m.beneficiary ?? null, paymentId: m.paymentId ?? null, expenseId: m.expenseId ?? null, createdById: userId });
}

export async function sessionMovements(tenantId: string, sessionId: string) {
  const rows = await db.orm.public.CashMovement.where({ tenantId, sessionId }).orderBy((m) => m.createdAt.asc()).all();
  return rows.map((m) => ({ id: m.id, kind: m.kind as CashKind, amount: toNumber(m.amount), description: m.description, beneficiary: m.beneficiary, paymentId: m.paymentId, expenseId: m.expenseId, createdAt: String(m.createdAt) }));
}

export async function closeCashSession(tenantId: string, sessionId: string, counted: number, notes: string | null, userId: string) {
  const s = await db.orm.public.CashSession.where({ tenantId, id: sessionId }).first();
  if (!s || s.closedAt) return { ok: false as const, message: "El turno no está abierto." };
  const moves = await sessionMovements(tenantId, sessionId);
  const expected = expectedCash(moves);
  await db.orm.public.CashSession.where({ tenantId, id: sessionId }).update({ closedAt: now(), closedById: userId, expectedAmount: dec(expected), countedAmount: dec(counted), difference: dec(counted - expected), closingNotes: notes });
  return { ok: true as const, expected };
}

export async function cashHistory(tenantId: string, limit = 20) {
  const rows = await db.orm.public.CashSession.where({ tenantId }).where((s) => s.closedAt.isNotNull()).orderBy((s) => s.closedAt.desc()).limit(limit).all();
  return rows.map((s) => ({ id: s.id, boxId: s.boxId, openedAt: String(s.openedAt), closedAt: String(s.closedAt), openingAmount: toNumber(s.openingAmount), expected: toNumber(s.expectedAmount), counted: toNumber(s.countedAmount), difference: toNumber(s.difference), notes: s.closingNotes }));
}
