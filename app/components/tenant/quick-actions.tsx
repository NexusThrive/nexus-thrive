import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  ChevronRight,
  FileText,
  HandCoins,
  Receipt,
  UserPlus,
} from "lucide-react";
import type { VerticalTerms } from "@/lib/vertical-terms";

type QuickAction = {
  id: string;
  label: string;
  hint: string;
  /** Ruta relativa al tenant. */
  path: string;
  icon: LucideIcon;
};

type QuickActionsProps = {
  /** Slug del tenant: los destinos se construyen con él (nunca hardcodeado). */
  tenantSlug: string;
  /** Vocabulario de la vertical activa (Socios / Pacientes / Turistas…). */
  terms: VerticalTerms;
};

/**
 * Acciones rápidas del dashboard (Server Component). Una sola card, filas de
 * 56 px, icono Lucide discreto en muted (sin chips de color) y chevron.
 */
export default function QuickActions({ tenantSlug, terms }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: "new-customer",
      label: `Nuevo ${terms.customer.toLowerCase()}`,
      hint: "Agregar un contacto",
      path: "/crm",
      icon: UserPlus,
    },
    {
      id: "register-payment",
      label: "Registrar pago",
      hint: "Cobrar un movimiento",
      path: "/finance",
      icon: HandCoins,
    },
    {
      id: "register-expense",
      label: "Registrar gasto",
      hint: "Anotar un egreso",
      path: "/finance",
      icon: Receipt,
    },
    {
      id: "new-membership",
      label: "Nueva membresía",
      hint: "Registrar un plan",
      path: "/memberships",
      icon: CalendarCheck,
    },
    {
      id: "create-invoice",
      label: "Crear factura",
      hint: "Generar un documento",
      path: "/finance",
      icon: FileText,
    },
  ];

  return (
    <section
      aria-labelledby="quick-actions-title"
      className="rounded-lg border border-border bg-card"
    >
      <div className="border-b border-border px-5 py-4">
        <h2
          id="quick-actions-title"
          className="font-display text-base font-semibold text-foreground"
        >
          Acciones rápidas
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Atajos para lo que haces cada día.
        </p>
      </div>

      <ul>
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <li key={action.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/${tenantSlug}${action.path}`}
                className="group flex h-14 items-center gap-3 px-5 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-[18px] shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {action.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {action.hint}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
