import { CalendarDays } from "lucide-react";
import ModulePlaceholder from "../../../components/tenant/module-placeholder";

/**
 * Módulo Reservas/Bookings. Ruta habilitada por TenantModule (el sidebar
 * dinámico la muestra cuando está activa). Implementación en roadmap:
 * hoy es un placeholder que recuerda el concepto con el vocabulario de la
 * vertical (ver lib/vertical-terms.ts).
 */
export default function BookingsPage() {
  return (
    <ModulePlaceholder
      title="Reservas"
      description="Agenda las reservas de tu negocio y controla la ocupación del día."
      icon={CalendarDays}
    />
  );
}