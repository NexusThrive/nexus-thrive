import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CalendarCheck, FileText, HandCoins, Receipt, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { VerticalTerms } from "@/lib/vertical-terms";

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
  /** Vocabulario de la vertical activa (Socios / Pacientes / Turistas…). */
  terms: VerticalTerms;
};

/**
 * Acciones rápidas del dashboard. Cada acción navega al módulo correspondiente
 * del tenant (los formularios llegan en fases siguientes).
 */
export default function QuickActions({ tenantSlug, terms }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: "new-customer",
      label: `Nuevo ${terms.customer.toLowerCase()}`,
      hint: "Agregar un contacto",
      path: "/crm",
      icon: UserPlus,
      tone: "bg-accent-subtle text-accent-text group-hover:bg-accent/20",
    },
    {
      id: "register-payment",
      label: "Registrar pago",
      hint: "Cobrar un movimiento",
      path: "/finance",
      icon: HandCoins,
      tone: "bg-success/10 text-success group-hover:bg-success/15",
    },
    {
      id: "register-expense",
      label: "Registrar gasto",
      hint: "Anotar un egreso",
      path: "/finance",
      icon: Receipt,
      tone: "bg-destructive/10 text-destructive group-hover:bg-destructive/15",
    },
    {
      id: "new-membership",
      label: "Nueva membresía",
      hint: "Registrar un plan",
      path: "/memberships",
      icon: CalendarCheck,
      tone: "bg-gold-100 text-gold-700 group-hover:bg-gold-100/70",
    },
    {
      id: "create-invoice",
      label: "Crear factura",
      hint: "Generar un documento",
      path: "/finance",
      icon: FileText,
      tone: "bg-muted text-muted-foreground group-hover:bg-muted/70",
    },
  ];

  return (
    <section
      aria-labelledby="quick-actions-title"
      className="rounded-lg border border-border bg-card p-5 shadow-xs"
    >
      <div className="mb-4">
        <h2
          id="quick-actions-title"
          className="text-base font-semibold text-foreground"
        >
          Acciones rápidas
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
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
                "group flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors",
                "hover:border-accent/40 hover:bg-muted",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
                <span className="block truncate text-sm font-medium text-foreground">
                  {action.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
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
