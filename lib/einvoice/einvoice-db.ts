import { documentCode, type DocumentKind, type DocumentLineInput } from "@/lib/business/commercial-document";
import { toNumber } from "@/lib/format";
import { db } from "@/prisma/db";
import { buildFiscalPayload, fiscalKindOf } from "./payload";
import type { FiscalKind, FiscalPayload } from "./port";
import { checkWebhookUrl } from "@/lib/events/ssrf";
import { decryptCredentials, encryptCredentials } from "@/lib/providers/connections";
import { httpEInvoice } from "./http-provider";
import { einvoicePort } from "./registry";

/**
 * Facturación electrónica (servidor). Cada documento comercial del negocio con la facturación
 * activada deja su documento fiscal en cola (PENDING_PROVIDER) EN LA MISMA transacción: vender nunca
 * se bloquea. El envío al proveedor es aparte, en orden, sin duplicar y con causa legible si lo rechaza.
 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Writer = Pick<Tx, "orm">;

const instant = () => Temporal.Instant.fromEpochMilliseconds(Date.now());
const LINE = (l: DocumentLineInput & { total: number }) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, discountPct: l.discountPct ?? 0, taxRatePct: l.taxRatePct ?? 0, total: l.total });

/** Emisor del negocio para el documento fiscal. */
async function issuerOf(tx: Writer, tenantId: string) {
  const t = await tx.orm.public.Tenant.where({ id: tenantId }).select("name", "legalName", "taxId", "address", "city", "whatsappNumber").first();
  return { name: t?.legalName || t?.name || "", legalName: t?.legalName ?? null, documentType: "NIT", documentNumber: t?.taxId ? t.taxId.replace(/[^0-9A-Za-z]/g, "") : null, address: t?.address ?? null, city: t?.city ?? null, phone: t?.whatsappNumber ?? null };
}

/**
 * Deja en cola el documento fiscal de un documento comercial recién creado (si el negocio lo tiene
 * activado y el tipo se factura). Es parte de la transacción de la venta; nunca rechaza una venta.
 */
export async function enqueueFiscal(
  tx: Writer,
  tenantId: string,
  doc: { id: string; kind: DocumentKind; number: number; prefix: string | null; issueDate: string; customerName: string; customerDoc: string | null; lines: readonly (DocumentLineInput & { total: number })[]; totals: { subtotal: number; discountTotal: number; taxTotal: number; total: number }; relatedCode?: string | null; notes?: string | null },
): Promise<void> {
  const kind = fiscalKindOf(doc.kind);
  if (!kind) return;
  const tenant = await tx.orm.public.Tenant.where({ id: tenantId }).select("einvoiceEnabled").first();
  if (!tenant?.einvoiceEnabled) return;
  const code = documentCode(doc.kind, doc.number);
  const payload = buildFiscalPayload({
    kind,
    documentKind: doc.kind,
    code,
    number: doc.number,
    prefix: doc.prefix,
    issueDate: doc.issueDate,
    issuer: await issuerOf(tx, tenantId),
    acquirer: { name: doc.customerName, documentNumber: doc.customerDoc ? doc.customerDoc.replace(/[^0-9A-Za-z]/g, "") : null },
    lines: doc.lines.map(LINE),
    totals: doc.totals,
    relatedCode: doc.relatedCode,
    notes: doc.notes,
  });
  await tx.orm.public.FiscalDocument.create({ tenantId, invoiceId: doc.id, kind, payload: payload as never });
}

export type FiscalRow = { id: string; kind: FiscalKind; code: string; status: string; provider: string | null; cufe: string | null; rejectReason: string | null; attempts: number; total: number; acquirer: string; createdAt: string };

const toRow = (d: Record<string, unknown>): FiscalRow => {
  const p = d.payload as FiscalPayload;
  return { id: String(d.id), kind: String(d.kind) as FiscalKind, code: p.code, status: String(d.status), provider: (d.provider as string | null) ?? null, cufe: (d.cufe as string | null) ?? null, rejectReason: (d.rejectReason as string | null) ?? null, attempts: Number(d.attempts), total: p.total, acquirer: p.acquirer.name, createdAt: String(d.createdAt) };
};

export async function listFiscal(tenantId: string, limit = 100): Promise<FiscalRow[]> {
  const rows = await db.orm.public.FiscalDocument.where({ tenantId }).orderBy((d) => d.createdAt.desc()).limit(limit).all();
  return rows.map((r) => toRow(r as unknown as Record<string, unknown>));
}

export async function fiscalSettings(tenantId: string): Promise<{ enabled: boolean; provider: string | null; connected: boolean; pending: number }> {
  const [t, conn, pending] = await Promise.all([
    db.orm.public.Tenant.where({ id: tenantId }).select("einvoiceEnabled").first(),
    db.orm.public.ExternalConnection.where({ tenantId, kind: "EINVOICE", status: "CONNECTED" }).first(),
    db.orm.public.FiscalDocument.where({ tenantId, status: "PENDING_PROVIDER" }).aggregate((a) => ({ n: a.count() })),
  ]);
  return { enabled: Boolean(t?.einvoiceEnabled), provider: conn?.provider ?? null, connected: Boolean(conn), pending: Number(pending.n) };
}

export async function setFiscalEnabled(tenantId: string, enabled: boolean): Promise<void> {
  await db.orm.public.Tenant.where({ id: tenantId }).update({ einvoiceEnabled: enabled });
}

/** Puerto de una conexión: los fijos (prueba) o el HTTP, con su URL y su llave cifrada. */
function portOf(conn: { provider: string; config: unknown; credentialsEnc: string | null }) {
  if (conn.provider !== "http") return einvoicePort(conn.provider);
  const url = (conn.config as { url?: string } | null)?.url;
  if (!url || !conn.credentialsEnc) return undefined;
  try {
    return httpEInvoice({ url, token: decryptCredentials(conn.credentialsEnc).token ?? "" });
  } catch {
    return undefined;
  }
}

/** Conecta el proveedor de PRUEBA (sin credenciales). El real se conecta con sus credenciales cuando exista. */
export async function connectSandboxProvider(tenantId: string): Promise<void> {
  await db.orm.public.ExternalConnection.upsert({ create: { tenantId, kind: "EINVOICE", provider: "sandbox", environment: "sandbox", status: "CONNECTED" }, update: { status: "CONNECTED", lastError: null }, conflictOn: { tenantId, kind: "EINVOICE", provider: "sandbox", environment: "sandbox" } });
}

/**
 * Envía al proveedor los documentos en espera, del más antiguo al más nuevo, de a uno. Sin proveedor
 * conectado no envía nada (siguen en espera). Un documento aceptado, rechazado o enviado no se vuelve a
 * enviar: no hay duplicados. El rechazo guarda la causa legible; corregir y reintentar lo vuelve a poner en cola.
 */
export async function submitPending(tenantId: string, limit = 50): Promise<{ sent: number; accepted: number; rejected: number }> {
  const conn = await db.orm.public.ExternalConnection.where({ tenantId, kind: "EINVOICE", status: "CONNECTED" }).first();
  const port = conn ? portOf(conn) : undefined;
  if (!conn || !port) return { sent: 0, accepted: 0, rejected: 0 };
  const queue = await db.orm.public.FiscalDocument.where({ tenantId, status: "PENDING_PROVIDER" }).orderBy((d) => d.createdAt.asc()).limit(limit).all();
  const out = { sent: 0, accepted: 0, rejected: 0 };
  for (const doc of queue) {
    // Reclamo: solo el que lo pasa de PENDING_PROVIDER a SUBMITTED lo envía (dos envíos a la vez no duplican).
    const claim = db.sql.public.FiscalDocument.update({ status: "SUBMITTED", provider: port.provider, attempts: doc.attempts + 1, lastAttemptAt: instant() })
      .where((f, fns) => fns.and(fns.eq(f.id, doc.id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "PENDING_PROVIDER")))
      .returning("id")
      .build();
    if ((await db.transaction((tx) => tx.query(claim))).length === 0) continue;
    try {
      const r = await port.submit(doc.payload as unknown as FiscalPayload);
      out.sent++;
      if (r.status === "ACCEPTED") {
        out.accepted++;
        await db.orm.public.FiscalDocument.where({ tenantId, id: doc.id }).update({ status: "ACCEPTED", providerRef: r.providerRef, cufe: r.cufe, rejectReason: null });
      } else if (r.status === "REJECTED") {
        out.rejected++;
        await db.orm.public.FiscalDocument.where({ tenantId, id: doc.id }).update({ status: "REJECTED", rejectReason: r.reason.slice(0, 400) });
      } else {
        await db.orm.public.FiscalDocument.where({ tenantId, id: doc.id }).update({ providerRef: r.providerRef });
      }
    } catch (error) {
      // Fallo del proveedor (red, caído): vuelve a la cola para el próximo intento; la venta ya estaba hecha.
      await db.orm.public.FiscalDocument.where({ tenantId, id: doc.id }).update({ status: "PENDING_PROVIDER", rejectReason: `Proveedor no disponible: ${error instanceof Error ? error.message.slice(0, 150) : "error"}` });
    }
  }
  return out;
}

/** Vuelve a poner en cola un documento rechazado, con el contenido corregido (emisor al día). */
export async function retryFiscal(tenantId: string, id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const d = await db.orm.public.FiscalDocument.where({ tenantId, id }).first();
  if (!d || d.status !== "REJECTED") return { ok: false, message: "Solo se reintentan los documentos rechazados." };
  const issuer = await issuerOf({ orm: db.orm } as Writer, tenantId);
  const payload = { ...(d.payload as unknown as FiscalPayload), issuer };
  await db.orm.public.FiscalDocument.where({ tenantId, id }).update({ status: "PENDING_PROVIDER", rejectReason: null, payload: payload as never });
  return { ok: true };
}

/**
 * Documento soporte: la compra a un proveedor no obligado a facturar se documenta con una factura de
 * proveedor registrada. Se arma desde la factura de proveedor (con su tercero) y se envía por el mismo puerto.
 */
export async function createSupportDocument(tenantId: string, supplierInvoiceId: string): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const inv = await db.orm.public.SupplierInvoice.where({ tenantId, id: supplierInvoiceId }).first();
  if (!inv) return { ok: false, message: "No se encontró la factura del proveedor." };
  if (await db.orm.public.FiscalDocument.where({ tenantId, supplierInvoiceId }).select("id").first()) return { ok: false, message: "Esa compra ya tiene su documento soporte." };
  const party = await db.orm.public.Party.where({ tenantId, id: inv.supplierPartyId }).first();
  const issuer = await issuerOf({ orm: db.orm } as Writer, tenantId);
  const total = toNumber(inv.total);
  const payload = buildFiscalPayload({
    kind: "SUPPORT_DOCUMENT",
    documentKind: "BILL",
    code: `DS-${inv.number}`,
    number: Number(inv.number.replace(/\D/g, "")) || 0,
    issueDate: String(inv.issueDate).slice(0, 10),
    // En un documento soporte el «vendedor» es el proveedor y el adquirente es el negocio que compra.
    issuer: { name: party?.legalName ?? "Proveedor", documentType: party?.documentType ?? null, documentNumber: party?.documentNumber ?? null, address: party?.addressLine ?? null, city: party?.city ?? null, email: party?.email ?? null },
    acquirer: issuer,
    lines: [{ description: `Compra según factura ${inv.number}`, quantity: 1, unitPrice: toNumber(inv.subtotal), discountPct: 0, taxRatePct: 0, total }],
    totals: { subtotal: toNumber(inv.subtotal), discountTotal: 0, taxTotal: toNumber(inv.taxTotal), total },
    notes: "Documento soporte en adquisiciones a no obligados a facturar",
  });
  const created = await db.orm.public.FiscalDocument.create({ tenantId, supplierInvoiceId, kind: "SUPPORT_DOCUMENT", payload: payload as never });
  return { ok: true, id: created.id };
}

/** Conecta el proveedor tecnológico real por HTTP (su URL y la llave que te dio). La llave se guarda cifrada. */
export async function connectHttpProvider(tenantId: string, input: { url: string; token: string }): Promise<{ ok: true } | { ok: false; message: string }> {
  const checked = checkWebhookUrl(input.url);
  if (!checked.ok) return { ok: false, message: checked.reason };
  if (input.token.trim().length < 8) return { ok: false, message: "Escribe la llave que te dio el proveedor." };
  const enc = encryptCredentials({ token: input.token.trim() });
  await db.orm.public.ExternalConnection.upsert({
    create: { tenantId, kind: "EINVOICE", provider: "http", environment: "production", status: "CONNECTED", credentialsEnc: enc, credentialsKeyId: "v1", config: { url: checked.url.toString() } as never },
    update: { status: "CONNECTED", credentialsEnc: enc, config: { url: checked.url.toString() } as never, lastError: null },
    conflictOn: { tenantId, kind: "EINVOICE", provider: "http", environment: "production" },
  });
  return { ok: true };
}
