import { redirect } from "next/navigation";
import { requirePageContext } from "@/lib/core/tenancy/context";

/** Los pedidos de la tienda viven ahora en una sola pantalla de Pedidos (`/ventas/pedidos`). Esta ruta queda para los enlaces guardados. */
export default async function StoreOrdersRedirect({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  // Aun para redirigir se comprueba la sesión y la membresía: nada se revela a quien no tenga acceso.
  await requirePageContext(tenant, "/ventas/pedidos");
  redirect(`/${tenant}/ventas/pedidos`);
}
