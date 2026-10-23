import { ShoppingCart } from "lucide-react";
import ModulePlaceholder from "@/components/templates/module-placeholder";
import { requirePageContext } from "@/lib/tenant/context";

/** Módulo Pedidos: habilitado por TenantModule; implementación en roadmap. */
export default async function OrdersPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  // Aunque es un marcador, solo se ve con el módulo activo (SEC-06).
  await requirePageContext(tenantSlug, "/orders");
  return (
    <ModulePlaceholder
      title="Pedidos"
      description="Registra los pedidos de tu negocio y da seguimiento hasta la entrega."
      icon={ShoppingCart}
    />
  );
}
