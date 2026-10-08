import { MessageCircle } from "lucide-react";
import ModulePlaceholder from "../../../components/tenant/module-placeholder";

/** Módulo WhatsApp: habilitado por TenantModule; implementación en roadmap. */
export default function WhatsAppPage() {
  return (
    <ModulePlaceholder
      title="WhatsApp"
      description="Conecta tu negocio con tus clientes por WhatsApp y centraliza las conversaciones."
      icon={MessageCircle}
    />
  );
}