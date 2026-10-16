import { Banknote } from "lucide-react";
import ModulePlaceholder from "@/components/templates/module-placeholder";

/** Módulo Pagos: habilitado por TenantModule; implementación en roadmap. */
export default function PaymentsPage() {
  return (
    <ModulePlaceholder
      title="Pagos"
      description="Centraliza los pagos que recibes y su conciliación con los módulos."
      icon={Banknote}
    />
  );
}