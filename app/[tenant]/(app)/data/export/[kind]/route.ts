import { can } from "@/lib/business/permissions";
import { exportCustomers, exportProducts } from "@/lib/data-exchange/exchange-db";
import { CUSTOMER_EXAMPLE, CUSTOMER_HEADERS, PRODUCT_EXAMPLE, PRODUCT_HEADERS } from "@/lib/data-exchange/rows";
import { toCsv } from "@/lib/data-exchange/table";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

/**
 * Descarga de clientes o catálogo en CSV (`?plantilla=1` baja solo el ejemplo
 * vacío). Pide sesión, negocio activo y permiso de intercambio de datos.
 */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string; kind: string }> }) {
  const { tenant, kind } = await params;
  if (kind !== "customers" && kind !== "products") return new Response("No encontrado", { status: 404 });
  const ctx = await requireTenantContext(tenant);
  if (!ctx || !can(ctx.role, "data.exchange")) return new Response("No autorizado", { status: 403 });
  const template = new URL(request.url).searchParams.get("plantilla") === "1";
  const body = template
    ? kind === "customers"
      ? toCsv(CUSTOMER_HEADERS, [CUSTOMER_EXAMPLE])
      : toCsv(PRODUCT_HEADERS, [PRODUCT_EXAMPLE])
    : kind === "customers"
      ? await exportCustomers(ctx.tenantId)
      : await exportProducts(ctx.tenantId);
  if (!template) await logTenantAction(ctx, "BIZ_DATA_EXPORT", { kind });
  const name = `${kind === "customers" ? "clientes" : "catalogo"}${template ? "-plantilla" : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
