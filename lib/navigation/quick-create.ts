import type { LucideIcon } from "lucide-react";
import { Building2, CalendarPlus, FileText, HandCoins, Receipt, UserPlus } from "lucide-react";
import type { ModuleValue, VerticalValue } from "@/lib/admin/catalogs";
import { can, type BusinessPermission } from "@/lib/business/permissions";
import { getVerticalTerms } from "@/lib/vertical-terms";

export type QuickCreateAction = {
  key: string;
  label: string;
  hint: string;
  /** Ruta relativa al negocio a la que lleva la acción. */
  href: string;
  icon: LucideIcon;
  /** Permiso que exige la acción; sin él, cualquier miembro del equipo puede. */
  permission?: BusinessPermission;
};

/**
 * Lo que se puede crear desde el botón central (móvil), la paleta de comandos
 * y el inicio: solo con los módulos activos del negocio. `limit` (4 por
 * defecto, los que caben en la hoja móvil y el inicio) recorta; el botón
 * «Crear» de la navbar pide todas. Con `role`, solo las que ese rol puede
 * hacer (la decisión que cuenta sigue siendo la del servidor en cada acción).
 */
export function quickCreateActions(
  vertical: VerticalValue,
  activeModules: readonly ModuleValue[],
  limit = 4,
  role?: string,
): QuickCreateAction[] {
  const terms = getVerticalTerms(vertical);
  const has = (m: ModuleValue) => activeModules.includes(m);
  const actions: QuickCreateAction[] = [];
  if (has("construction")) {
    actions.push({
      key: "new-project",
      label: vertical === "construction" ? "Nueva obra" : "Nuevo proyecto",
      hint: "Presupuesto y cotización",
      href: "/projects",
      icon: Building2,
      permission: "projects.create",
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
      { key: "payment", label: "Registrar pago", hint: "Cobrar y generar comprobante", href: "/finance?nuevo=pago", icon: HandCoins, permission: "money.handle" },
      { key: "expense", label: "Registrar gasto", hint: "Anotar un egreso de caja", href: "/finance?nuevo=gasto", icon: Receipt, permission: "money.handle" },
    );
  }
  if (has("bookings")) {
    actions.push({ key: "booking", label: "Nueva reserva", hint: "Reservar un horario", href: "/bookings", icon: CalendarPlus });
  }
  if (has("billing")) {
    actions.push({ key: "invoice", label: "Crear factura", hint: "Generar un documento", href: "/billing", icon: FileText });
  }
  return actions.filter((action) => !role || !action.permission || can(role, action.permission)).slice(0, limit);
}

/** Mini-modales disponibles: crear sin salir de la pantalla en la que se está. */
export type QuickSheet = "payment" | "expense" | "customer";

const QUICK_SHEETS: Record<string, QuickSheet> = {
  payment: "payment",
  expense: "expense",
  "new-customer": "customer",
};

/**
 * Qué mini-modal abre una acción de «Crear» (por su `key`), o `null` si todavía
 * no tiene: entonces se navega a su sección como siempre. Una operación nueva se
 * suma aquí y en `QuickCreateHost`; su `href` sigue siendo el «panel completo».
 */
export const quickSheetFor = (key: string): QuickSheet | null => QUICK_SHEETS[key] ?? null;
