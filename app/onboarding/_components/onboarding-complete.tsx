"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus,
  CreditCard,
  FileText,
  LayoutDashboard,
  Sparkles,
  UserPlus,
  Wallet,
} from "lucide-react";
import { VERTICAL_LABELS } from "@/lib/admin-catalogs";
import type {
  ModuleValue,
  OnboardingDraft,
} from "@/lib/onboarding/types";

type QuickAction = {
  icon: typeof UserPlus;
  title: string;
  description: string;
  module: ModuleValue;
};

const QUICK_ACTIONS_BY_MODULE: Record<ModuleValue, QuickAction> = {
  crm: {
    module: "crm",
    icon: UserPlus,
    title: "Agrega tu primer cliente",
    description: "Guarda el cliente y su contacto para empezar la ficha 360°.",
  },
  payments: {
    module: "payments",
    icon: CreditCard,
    title: "Registra tu primer cobro",
    description: "Anota un pago y controla tus ingresos desde el inicio.",
  },
  bookings: {
    module: "bookings",
    icon: CalendarPlus,
    title: "Agenda tu primera reserva",
    description: "Crea la primera cita o reserva del día.",
  },
  quotes: {
    module: "quotes",
    icon: FileText,
    title: "Arma tu primera cotización",
    description: "Prepara un presupuesto para tu primer cliente.",
  },
  finance: {
    module: "finance",
    icon: Wallet,
    title: "Registra tu primer movimiento",
    description: "Anota un ingreso o gasto y mira tu flujo.",
  },
  dashboard: {
    module: "dashboard",
    icon: LayoutDashboard,
    title: "Conoce tu tablero",
    description: "Revisa el dashboard: ahí vive el día a día de tu negocio.",
  },
  billing: {
    module: "billing",
    icon: FileText,
    title: "Crea tu primera factura",
    description: "Emitir una factura y enviársela a tu cliente.",
  },
  inventory: {
    module: "inventory",
    icon: LayoutDashboard,
    title: "Carga tus productos",
    description: "Añade el primer producto o servicio a tu inventario.",
  },
  whatsapp: {
    module: "whatsapp",
    icon: UserPlus,
    title: "Conecta WhatsApp",
    description: "Vincula tu número para atender desde NEXUS.",
  },
  memberships: {
    module: "memberships",
    icon: UserPlus,
    title: "Crea tu primera membresía",
    description: "Define un plan recurrente para tus clientes.",
  },
  orders: {
    module: "orders",
    icon: CreditCard,
    title: "Toma tu primer pedido",
    description: "Registra una venta o pedido desde el módulo.",
  },
};

/** Prioridad de las acciones mostradas (máximo 3 tarjetas). */
const QUICK_ACTION_ORDER: ModuleValue[] = [
  "crm",
  "payments",
  "bookings",
  "quotes",
  "finance",
];

/** Pantalla final: espacio listo + primeros 3 minutos + CTA de entrada. */
export default function OnboardingComplete({
  draft,
  slug,
}: {
  draft: OnboardingDraft;
  slug: string;
}) {
  const actions = buildQuickActions(draft.selectedModules);
  const verticalLabel = draft.vertical
    ? VERTICAL_LABELS[draft.vertical]
    : "";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-500 text-white ring-8 ring-amber-500/15">
          <Sparkles className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          Tu espacio NEXUS está listo
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-500">
          {draft.name}
          {verticalLabel ? ` · ${verticalLabel}` : ""} ya tiene su espacio. Lo
          puedes encontrar en{" "}
          <span className="font-medium text-slate-700">
            nexusthrive.co/{slug}
          </span>
          .
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Tus primeros 3 minutos en NEXUS
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Tres pasos rápidos para dejar tu espacio andando.
        </p>

        <ol className="mt-4 space-y-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <li
                key={`${action.module}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {index + 1}. {action.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {action.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <Link
        href={`/${slug}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
      >
        Entrar a mi espacio NEXUS
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function buildQuickActions(
  selectedModules: ModuleValue[],
): QuickAction[] {
  const selected = new Set(selectedModules);
  const ordered = QUICK_ACTION_ORDER.filter((moduleName) =>
    selected.has(moduleName),
  );
  if (ordered.length === 0) {
    return [QUICK_ACTIONS_BY_MODULE["dashboard"]];
  }
  return ordered.slice(0, 3).map((moduleName) => QUICK_ACTIONS_BY_MODULE[moduleName]);
}