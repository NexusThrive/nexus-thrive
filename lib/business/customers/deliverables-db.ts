import { addAttachment, getAttachment, listAttachments } from "@/lib/business/sales/finance-db";
import { db } from "@/prisma/db";
import { DELIVERABLE_STATES, REVIEW_LINK_DAYS, TOKEN_PATTERN, canSend, hashToken, newReviewToken, validateDecision, validateDeliverable, type DeliverableStatus } from "./deliverables";

/** Entregables del negocio por `tenantId`; el cliente externo entra solo con el enlace de revisión (huella SHA-256, caduca, un solo propósito). */
export type DeliverableFile = { id: string; fileName: string; mimeType: string; byteSize: number };
export type DeliverableRow = { id: string; title: string; description: string | null; status: DeliverableStatus; projectId: string | null; projectName: string | null; customerId: string | null; customerName: string | null; files: DeliverableFile[]; sentAt: string | null; decidedAt: string | null; decidedByName: string | null; clientComment: string | null; createdAt: string };
export type ReviewView = { title: string; description: string | null; status: DeliverableStatus; businessName: string; files: DeliverableFile[]; decidedAt: string | null; decidedByName: string | null; clientComment: string | null };
type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string; field?: string };

const KIND = "DELIVERABLE";
const asStatus = (s: string): DeliverableStatus => ((DELIVERABLE_STATES as readonly string[]).includes(s) ? (s as DeliverableStatus) : "DRAFT");
const instant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);

export async function createDeliverable(tenantId: string, input: { title: string; description?: string | null; projectId?: string | null; taskId?: string | null; customerId?: string | null }, userId: string): Promise<Result<{ id: string }>> {
  const problem = validateDeliverable(input);
  if (problem) return { ok: false, message: problem, field: "title" };
  if (input.projectId && !(await db.orm.public.Project.where({ tenantId, id: input.projectId }).select("id").first())) return { ok: false, message: "El proyecto no existe en este negocio." };
  if (input.customerId && !(await db.orm.public.Customer.where({ tenantId, id: input.customerId }).select("id").first())) return { ok: false, message: "El contacto no existe en este negocio." };
  if (input.taskId && !(await db.orm.public.Task.where({ tenantId, id: input.taskId }).select("id").first())) return { ok: false, message: "La tarea no existe en este negocio." };
  const row = await db.orm.public.Deliverable.create({ tenantId, title: input.title.trim(), description: input.description?.trim() || null, projectId: input.projectId ?? null, taskId: input.taskId ?? null, customerId: input.customerId ?? null, createdById: userId });
  return { ok: true, id: row.id };
}

/** Adjunta un archivo mientras el entregable se prepara o se devolvió con cambios; nunca a uno en revisión o aprobado. */
export async function addDeliverableFile(tenantId: string, id: string, file: File, userId: string): Promise<Result> {
  const d = await db.orm.public.Deliverable.where({ tenantId, id }).first();
  if (!d) return { ok: false, message: "No se encontró el entregable." };
  if (!canSend(d.status)) return { ok: false, message: "Este entregable ya está en revisión o aprobado: no admite más archivos." };
  try {
    await addAttachment(tenantId, KIND, id, file, userId);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "No se pudo guardar el archivo." };
  }
  return { ok: true };
}

/** Pone el entregable en revisión del cliente y devuelve el enlace en claro (única vez que existe). Pide al menos un archivo. */
export async function sendForReview(tenantId: string, id: string, now = Date.now()): Promise<Result<{ token: string }>> {
  const d = await db.orm.public.Deliverable.where({ tenantId, id }).first();
  if (!d) return { ok: false, message: "No se encontró el entregable." };
  if (!canSend(d.status)) return { ok: false, message: d.status === "APPROVED" ? "Este entregable ya fue aprobado." : "Este entregable ya está en revisión." };
  if ((await listAttachments(tenantId, KIND, [id])).length === 0) return { ok: false, message: "Adjunta al menos un archivo antes de enviarlo al cliente." };
  const { token, hash } = newReviewToken();
  const claim = db.sql.public.Deliverable.update({ status: "IN_REVIEW", reviewTokenHash: hash, reviewTokenExpiresAt: instant(now + REVIEW_LINK_DAYS * 86_400_000), sentAt: instant(now), decidedAt: null, decidedByName: null, clientComment: null })
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, d.status)))
    .returning("id")
    .build();
  if ((await db.transaction((tx) => tx.query(claim))).length === 0) return { ok: false, message: "El entregable cambió mientras lo enviabas. Vuelve a intentarlo." };
  return { ok: true, token };
}

async function byToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const d = await db.orm.public.Deliverable.where({ reviewTokenHash: hashToken(token) }).first();
  return d ?? null;
}

const expired = (d: { reviewTokenExpiresAt: unknown }, now: number) => !d.reviewTokenExpiresAt || Date.parse(String(d.reviewTokenExpiresAt)) < now;

/** Lo que ve el cliente con el enlace; `null` si no existe o caducó (igual respuesta: no se revela cuál). */
export async function getForReview(token: string, now = Date.now()): Promise<ReviewView | null> {
  const d = await byToken(token);
  if (!d || expired(d, now)) return null;
  const tenant = await db.orm.public.Tenant.where({ id: d.tenantId }).select("name").first();
  return { title: d.title, description: d.description, status: asStatus(d.status), businessName: tenant?.name ?? "", files: await filesOf(d.tenantId, d.id), decidedAt: d.decidedAt ? String(d.decidedAt) : null, decidedByName: d.decidedByName, clientComment: d.clientComment };
}

async function filesOf(tenantId: string, id: string): Promise<DeliverableFile[]> {
  return (await listAttachments(tenantId, KIND, [id])).map((f) => ({ id: f.id, fileName: f.fileName, mimeType: f.mimeType, byteSize: f.byteSize }));
}

/** Decisión del cliente, una sola vez: aprueba o pide cambios (con cuáles). Queda con fecha y el nombre que dejó. */
export async function decideDeliverable(token: string, input: { decision: string; name: string; comment: string }, now = Date.now()): Promise<Result<{ status: DeliverableStatus }>> {
  const d = await byToken(token);
  if (!d || expired(d, now)) return { ok: false, message: "Este enlace no existe o ya caducó." };
  if (d.status !== "IN_REVIEW") return { ok: false, message: "Este entregable ya fue decidido. ¡Gracias!" };
  const problem = validateDecision(input);
  if (problem) return { ok: false, message: problem.message, field: problem.field };
  const status = input.decision as DeliverableStatus;
  const claim = db.sql.public.Deliverable.update({ status, decidedAt: instant(now), decidedByName: input.name.trim().slice(0, 120), clientComment: input.comment.trim().slice(0, 1000) || null })
    .where((f, fns) => fns.and(fns.eq(f.id, d.id), fns.eq(f.status, "IN_REVIEW")))
    .returning("id")
    .build();
  if ((await db.transaction((tx) => tx.query(claim))).length === 0) return { ok: false, message: "Este entregable ya fue decidido. ¡Gracias!" };
  return { ok: true, status };
}

/** Un archivo del entregable para el cliente con enlace vigente; solo si pertenece a ese entregable. */
export async function readReviewFile(token: string, attachmentId: string, now = Date.now()) {
  const d = await byToken(token);
  if (!d || expired(d, now)) return null;
  if (!(await filesOf(d.tenantId, d.id)).some((f) => f.id === attachmentId)) return null;
  return getAttachment(d.tenantId, attachmentId);
}

/** Entregables del negocio, los más recientes primero, con sus archivos. */
export async function listDeliverables(tenantId: string, opts: { projectId?: string; limit?: number } = {}): Promise<DeliverableRow[]> {
  let q = db.orm.public.Deliverable.where({ tenantId });
  if (opts.projectId) q = q.where({ projectId: opts.projectId });
  const rows = await q.orderBy((d) => d.createdAt.desc()).limit(opts.limit ?? 200).all();
  const files = await listAttachments(tenantId, KIND, rows.map((r) => r.id));
  const projectIds = [...new Set(rows.map((r) => r.projectId).filter((x): x is string => Boolean(x)))];
  const customerIds = [...new Set(rows.map((r) => r.customerId).filter((x): x is string => Boolean(x)))];
  const [projects, customers] = await Promise.all([
    projectIds.length ? db.orm.public.Project.where({ tenantId }).where((p) => p.id.in(projectIds)).select("id", "name").all() : Promise.resolve([]),
    customerIds.length ? db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(customerIds)).select("id", "name").all() : Promise.resolve([]),
  ]);
  const pn = new Map(projects.map((p) => [p.id, p.name]));
  const cn = new Map(customers.map((c) => [c.id, c.name]));
  return rows.map((r) => ({ id: r.id, title: r.title, description: r.description, status: asStatus(r.status), projectId: r.projectId, projectName: r.projectId ? (pn.get(r.projectId) ?? null) : null, customerId: r.customerId, customerName: r.customerId ? (cn.get(r.customerId) ?? null) : null, files: files.filter((f) => f.ownerId === r.id).map((f) => ({ id: f.id, fileName: f.fileName, mimeType: f.mimeType, byteSize: f.byteSize })), sentAt: r.sentAt ? String(r.sentAt) : null, decidedAt: r.decidedAt ? String(r.decidedAt) : null, decidedByName: r.decidedByName, clientComment: r.clientComment, createdAt: String(r.createdAt) }));
}
