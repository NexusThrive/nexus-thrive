import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/business/permissions";
import { listProducts } from "@/lib/business/products-db";
import { listTerminals, myTurn } from "@/lib/pos/pos-db";
import { requireTenantContext } from "@/lib/tenant/context";
import PosView from "./_components/pos-view";

/** Punto de venta: turno por cajero en una terminal, venta de varias líneas, propina y pago mixto. */
export default async function PosPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/pos");
  if (!ctx) notFound();
  const header = <PageHeader eyebrow="Dinero" title="Punto de venta" description="Abre tu turno, vende y cierra con arqueo." />;
  if (!can(ctx.role, "money.handle")) {
    return (
      <div className="grid gap-5">
        {header}
        <Alert tone="info">Tu rol no maneja el punto de venta.</Alert>
      </div>
    );
  }
  const [terminals, turn, products] = await Promise.all([listTerminals(ctx.tenantId), myTurn(ctx.tenantId, ctx.memberId), listProducts(ctx.tenantId, { kind: ["PRODUCT", "SERVICE"], activeOnly: true, limit: 500 })]);
  return (
    <div className="grid gap-5">
      {header}
      <PosView
        slug={tenant}
        canManage={can(ctx.role, "business.manage")}
        terminals={terminals.map((t) => ({ id: t.id, name: t.name, busy: t.openTurn !== null && t.openTurn.sessionId !== turn?.sessionId }))}
        turn={turn}
        products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.trackStock ? p.stock : null, sku: p.sku, taxRatePct: p.taxRatePct }))}
      />
    </div>
  );
}
