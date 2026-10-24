"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/business/permissions";
import { connectSandboxProvider, createSupportDocument, retryFiscal, setFiscalEnabled, submitPending } from "@/lib/einvoice/einvoice-db";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type FiscalResult = { ok: true; message: string } | { ok: false; message: string };
const DENIED: FiscalResult = { ok: false, message: "Solo el dueño o administración maneja la factura electrónica." };
const refresh = (slug: string) => revalidatePath(`/${slug}/factura-electronica`);
const manager = async (slug: string) => {
  const ctx = await requireTenantContext(slug, "/factura-electronica");
  return ctx && can(ctx.role, "business.manage") ? ctx : null;
};

export async function setEnabledAction(slug: string, enabled: boolean): Promise<FiscalResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  await setFiscalEnabled(ctx.tenantId, enabled);
  await logTenantAction(ctx, "BIZ_EINVOICE", { action: enabled ? "enable" : "disable" });
  refresh(slug);
  return { ok: true, message: enabled ? "Factura electrónica activada: cada venta deja su documento en cola" : "Factura electrónica desactivada" };
}

export async function connectSandboxAction(slug: string): Promise<FiscalResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  await connectSandboxProvider(ctx.tenantId);
  await logTenantAction(ctx, "BIZ_EINVOICE", { action: "connect", provider: "sandbox" });
  refresh(slug);
  return { ok: true, message: "Proveedor de prueba conectado" };
}

export async function submitAction(slug: string): Promise<FiscalResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await submitPending(ctx.tenantId);
  await logTenantAction(ctx, "BIZ_EINVOICE", { action: "submit", ...r });
  refresh(slug);
  if (r.sent === 0) return { ok: true, message: "No hay documentos para enviar (o aún no hay proveedor conectado)" };
  return { ok: true, message: `${r.sent} enviados · ${r.accepted} aceptados · ${r.rejected} rechazados` };
}

export async function retryAction(slug: string, id: string): Promise<FiscalResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await retryFiscal(ctx.tenantId, id);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Vuelve a la cola con los datos al día" };
}

export async function supportDocAction(slug: string, supplierInvoiceId: string): Promise<FiscalResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await createSupportDocument(ctx.tenantId, supplierInvoiceId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_EINVOICE", { action: "support_document", supplierInvoiceId });
  refresh(slug);
  return { ok: true, message: "Documento soporte en cola" };
}
