import { Wallet } from "lucide-react";
import ModulePlaceholder from "../../components/tenant/module-placeholder";

export default function FinancePage() {
  return (
    <ModulePlaceholder
      title="Finanzas"
      description="Registra pagos y gastos, controla tu balance y revisa los movimientos del negocio."
      icon={Wallet}
    />
  );
}
