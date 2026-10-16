import type { LucideIcon } from "lucide-react";
import { Building2, CalendarPlus, FileText, HandCoins, Receipt, UserPlus } from "lucide-react";
import type { ModuleValue, VerticalValue } from "@/lib/admin-catalogs";
import { getVerticalTerms } from "@/lib/vertical-terms";

export type QuickCreateAction = {
  key: string;
  label: string;
  hint: string;
  /** Ruta relativa al negocio a la que lleva la acción. */
  href: string;
  icon: LucideIcon;
};

/**
 * Lo que se puede crear desde el botón central (móvil), la paleta de comandos
 * y el inicio: solo con los módulos activos del negocio, máximo cuatro.
 */
export function quickCreateActions(
  vertical: VerticalValue,
  activeModules: readonly ModuleValue[],
): QuickCreateAction[] {
  const terms = getVerticalTerms(vertical);
  const has = (m: ModuleValue) => activeModules.includes(m);
  const actions: QuickCreateAction[] = [];
  if (has("quotes")) {
    actions.push({
      key: "new-project",
      label: vertical === "construction" ? "Nueva obra" : "Nuevo proyecto",
      hint: "Presupuesto y cotización",
      href: "/projects",
      icon: Building2,
    });
  }
  if (has("crm")) {
    actions.push({
      key: "new-customer",
      label: `Nuevo ${terms.customer.toLowerCase()}`,
      hint: "Agregar un contacto",
      href: "/crm",
      icon: UserPlus,
    });
  }
  if (has("finance")) {
    actions.push(
      { key: "payment", label: "Registrar pago", hint: "Cobrar un movimiento", href: "/finance", icon: HandCoins },
      { key: "expense", label: "Registrar gasto", hint: "Anotar un egreso de caja", href: "/finance", icon: Receipt },
    );
  }
  if (has("bookings")) {
    actions.push({ key: "booking", label: "Nueva reserva", hint: "Reservar un horario", href: "/bookings", icon: CalendarPlus });
  }
  if (has("billing")) {
    actions.push({ key: "invoice", label: "Crear factura", hint: "Generar un documento", href: "/billing", icon: FileText });
  }
  return actions.slice(0, 4);
}
