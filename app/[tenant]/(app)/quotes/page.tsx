import { FileText } from "lucide-react";
import ModulePlaceholder from "../../../components/tenant/module-placeholder";

/** Módulo Cotizaciones: habilitado por TenantModule; implementación en roadmap. */
export default function QuotesPage() {
  return (
    <ModulePlaceholder
      title="Cotizaciones"
      description="Crea y envía cotizaciones a tus clientes con seguimiento de estado."
      icon={FileText}
    />
  );
}