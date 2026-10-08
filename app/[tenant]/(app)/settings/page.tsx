import { Settings } from "lucide-react";
import ModulePlaceholder from "../../../components/tenant/module-placeholder";

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Configuración"
      description="Ajusta los datos de tu negocio, el equipo de trabajo y las preferencias de la cuenta."
      icon={Settings}
    />
  );
}
