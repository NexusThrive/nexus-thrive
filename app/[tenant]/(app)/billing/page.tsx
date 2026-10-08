import { Receipt } from "lucide-react";
import ModulePlaceholder from "../../../components/tenant/module-placeholder";

/** Módulo Facturación: habilitado por TenantModule; implementación en roadmap. */
export default function BillingPage() {
  return (
    <ModulePlaceholder
      title="Facturación"
      description="Genera facturas y documentos de cobro para tus clientes."
      icon={Receipt}
    />
  );
}