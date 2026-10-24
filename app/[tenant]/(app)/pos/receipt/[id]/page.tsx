import { notFound } from "next/navigation";
import { PrintButton } from "@/components/molecules/print-button";
import { can } from "@/lib/business/permissions";
import { receiptOf } from "@/lib/pos/pos-db";
import { receiptLines } from "@/lib/pos/receipt";
import { requireTenantContext } from "@/lib/tenant/context";

/** Tiquete de una venta, listo para impresora térmica de 80 mm (o guardar como PDF). */
export default async function ReceiptPage({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant, id } = await params;
  const ctx = await requireTenantContext(tenant, "/pos");
  if (!ctx || !can(ctx.role, "money.handle")) notFound();
  const data = await receiptOf(ctx.tenantId, id);
  if (!data) notFound();
  return (
    <div className="grid justify-center gap-3 print:block">
      <style>{"@page { size: 80mm auto; margin: 4mm; } @media print { body { background: #fff; } }"}</style>
      <div className="flex gap-2 print:hidden">
        <PrintButton label="Imprimir tiquete" />
        <a href={`/${tenant}/pos/receipt/${id}/escpos`} className="inline-flex items-center rounded-md border border-border px-3 text-[13px] font-medium">Descargar ESC/POS</a>
      </div>
      <pre aria-label="Tiquete" className="w-[80mm] max-w-full overflow-x-auto bg-white p-3 font-mono text-[11px] leading-snug text-black">{receiptLines(data, 42).join("\n")}</pre>
    </div>
  );
}
