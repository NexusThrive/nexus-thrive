import { Users } from "lucide-react";
import ModulePlaceholder from "../../components/tenant/module-placeholder";

export default function CrmPage() {
  return (
    <ModulePlaceholder
      title="CRM"
      description="Gestiona tus clientes, contactos y el seguimiento de cada oportunidad comercial."
      icon={Users}
    />
  );
}
