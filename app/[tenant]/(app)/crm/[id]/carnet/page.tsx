import { notFound } from "next/navigation";
import { QrCode } from "@/components/atoms/qr-code";
import { PrintButton } from "@/components/molecules/print-button";
import { ensureAccessCode } from "@/lib/business/gym-db";
import { requireTenantContext } from "@/lib/tenant-context";
import { db } from "@/prisma/db";

/** Carné del socio para imprimir (tamaño tarjeta): foto, nombre y QR de acceso. */
export default async function CarnetPage({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant: slug, id } = await params;
  const ctx = await requireTenantContext(slug);
  if (!ctx) notFound();
  const [tenant, customer] = await Promise.all([
    db.orm.public.Tenant.where({ id: ctx.tenantId }).select("name").first(),
    db.orm.public.Customer.where({ tenantId: ctx.tenantId, id }).select("id", "name", "documentId", "photoId").first(),
  ]);
  if (!tenant || !customer) notFound();
  const code = await ensureAccessCode(ctx.tenantId, customer.id);
  if (!code) notFound();

  return (
    <div className="grid justify-items-center gap-6 py-6">
      <PrintButton label="Imprimir carné" />
      <article
        aria-label={`Carné de ${customer.name}`}
        className="grid w-[85.6mm] grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-black/15 bg-white p-4 text-black shadow-sm print:shadow-none"
        style={{ height: "54mm" }}
      >
        <div className="grid content-between self-stretch">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/60">{tenant.name}</p>
          {customer.photoId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${customer.photoId}`} alt="" className="size-[22mm] rounded-md object-cover" />
          ) : null}
          <div>
            <p className="text-[13px] font-bold leading-tight">{customer.name}</p>
            {customer.documentId ? <p className="text-[10px] text-black/60">Doc. {customer.documentId}</p> : null}
          </div>
        </div>
        <div className="grid justify-items-end gap-1">
          <QrCode value={code} size={120} label={`QR de acceso de ${customer.name}`} className="rounded-none" />
          <p className="font-mono text-[11px] font-semibold tracking-[0.2em]">{code}</p>
        </div>
      </article>
      <p className="max-w-sm text-center text-xs text-muted-foreground print:hidden">Muéstralo en la entrada o guárdalo en el celular. Si se pierde, genera un QR nuevo desde la ficha: el anterior deja de funcionar.</p>
    </div>
  );
}
