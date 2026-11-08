import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { listProducts } from "@/lib/business/catalog/products-db";
import { kardex, listWarehouses } from "@/lib/business/inventory/kardex";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import KardexView from "./_components/kardex-view";

/** Kardex de un producto: cada movimiento con su costo, su valor y el saldo que dejó. */
export default async function KardexPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ producto?: string }> }) {
  const { tenant } = await params;
  const { producto } = await searchParams;
  const ctx = await requireTenantContext(tenant, "/inventario/existencias");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Kardex" description="Movimientos de un producto." />
        <PermissionNotice permission="business.manage" action="ver el kardex" />
      </div>
    );
  }
  const products = (await listProducts(ctx.tenantId, { kind: ["PRODUCT"], activeOnly: false })).filter((p) => p.trackStock);
  const selected = products.find((p) => p.id === producto) ?? null;
  const [lines, warehouses] = selected ? await Promise.all([kardex(ctx.tenantId, selected.id, { limit: 200 }), listWarehouses(ctx.tenantId)]) : [[], []];
  return (
    <div className="grid gap-5">
      <PageHeader title="Kardex" description="Cada entrada, salida y ajuste de un producto con su costo y el saldo que dejó." />
      <KardexView slug={tenant} products={products.map((p) => ({ id: p.id, name: p.name }))} selectedId={selected?.id ?? null} lines={lines} warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))} />
    </div>
  );
}
