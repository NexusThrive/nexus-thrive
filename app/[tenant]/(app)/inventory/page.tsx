import { Package } from "lucide-react";
import ModulePlaceholder from "@/components/templates/module-placeholder";

export default function InventoryPage() {
  return (
    <ModulePlaceholder
      title="Inventario"
      description="Administra tus productos, existencias y movimientos de inventario."
      icon={Package}
    />
  );
}
