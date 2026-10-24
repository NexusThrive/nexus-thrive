import { can } from "@/lib/business/permissions";
import { receiptOf } from "@/lib/pos/pos-db";
import { escposBytes, receiptLines } from "@/lib/pos/receipt";
import { requireTenantContext } from "@/lib/tenant/context";

/** Bytes ESC/POS del tiquete para una app de impresión térmica (Bluetooth/USB). */
export async function GET(_request: Request, { params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant, id } = await params;
  const ctx = await requireTenantContext(tenant, "/pos");
  if (!ctx || !can(ctx.role, "money.handle")) return new Response("No autorizado", { status: 403 });
  const data = await receiptOf(ctx.tenantId, id);
  if (!data) return new Response("No encontrado", { status: 404 });
  return new Response(Buffer.from(escposBytes(receiptLines(data, 42))), { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="tiquete-${data.code}.bin"`, "Cache-Control": "no-store" } });
}
