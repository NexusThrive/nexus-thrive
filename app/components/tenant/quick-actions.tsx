import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CalendarCheck, FileText, HandCoins, Receipt, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";

type QuickAction = {
  id: string;
  label: string;
  hint: string;
  /** Ruta relativa al tenant. */
  path: string;
  icon: LucideIcon;
  tone: string;
};

type QuickActionsProps = {
  /** Slug del tenant: los destinos se construyen con él (nunca hardcodeado). */
  tenantSlug: string;
};

/**
 * Acciones rápidas del dashboard. Cada acción navega al módulo correspondiente
 * del tenant (los formularios llegan en fases siguientes).
 */
export default function QuickActions({ tenantSlug }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: "new-customer",
      label: "Nuevo cliente",
      hint: "Agregar un contacto",
      path: "/crm",
      icon: UserPlus,
      tone: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
    },
    {
      id: "register-payment",
      label: "Registrar pago",
      hint: "Cobrar un movimiento",
      path: "/finance",
      icon: HandCoins,
      tone: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    },
    {
      id: "register-expense",
      label: "Registrar gasto",
      hint: "Anotar un egreso",
      path: "/finance",
      icon: Receipt,
      tone: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
    },
    {
      id: "new-membership",
      label: "Nueva membresía",
      hint: "Registrar un plan",
      path: "/memberships",
      icon: CalendarCheck,
      tone: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    },
    {
      id: "create-invoice",
      label: "Crear factura",
      hint: "Generar un documento",
      path: "/finance",
      icon: FileText,
      tone: "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
    },
  ];

  return (
    <section
      aria-labelledby="quick-actions-title"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4">
        <h2
          id="quick-actions-title"
          className="text-base font-semibold text-slate-900"
        >
          Acciones rápidas
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Atajos para lo que haces cada día.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.id}
              href={`/${tenantSlug}${action.path}`}
              className={cn(
                "group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors",
                "hover:border-indigo-200 hover:bg-slate-50",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors",
                  action.tone,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">
                  {action.label}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {action.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
