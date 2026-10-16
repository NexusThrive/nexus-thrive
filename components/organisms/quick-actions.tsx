import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  FileText,
  HandCoins,
  Receipt,
  UserPlus,
} from "lucide-react";
import type { VerticalTerms } from "@/lib/vertical-terms";
import { IconTile } from "@/components/atoms/icon-tile";
import { ListItem } from "@/components/molecules/list-item";

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
 * Acciones rápidas del inicio (Server Component): filas `ListItem` con su
 * `IconTile`, que se hunden al presionarlas y llevan a cada módulo.
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
      className="nx-rise overflow-hidden rounded-lg border border-border bg-card"
      style={{ ["--i" as string]: 2 }}
    >
      <div className="border-b border-border px-[18px] py-4">
        <h2 id="quick-actions-title" className="font-display text-[15px] font-semibold text-foreground">
          Acciones rápidas
        </h2>
        <p className="text-xs text-muted-foreground">Lo que haces cada día</p>
      </div>
      <ul>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.id}>
              <Link
                href={`/${tenantSlug}${action.path}`}
                data-press="card"
                className="block focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <ListItem
                  interactive
                  chevron
                  leading={
                    <IconTile>
                      <Icon strokeWidth={1.6} />
                    </IconTile>
                  }
                  title={action.label}
                  subtitle={action.hint}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
