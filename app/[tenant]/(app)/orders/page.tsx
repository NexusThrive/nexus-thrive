import { ShoppingCart } from "lucide-react";
import ModulePlaceholder from "../../../components/tenant/module-placeholder";

/** Módulo Pedidos: habilitado por TenantModule; implementación en roadmap. */
export default function OrdersPage() {
  return (
    <ModulePlaceholder
      title="Pedidos"
      description="Registra los pedidos de tu negocio y da seguimiento hasta la entrega."
      icon={ShoppingCart}
    />
  );
}