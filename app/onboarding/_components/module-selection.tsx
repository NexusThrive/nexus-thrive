"use client";

import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  FileText,
  Layers,
  Package,
  Repeat,
  ShoppingCart,
  Sparkles,
  UserRoundPlus,
  Wallet,
  MessageCircle,
} from "lucide-react";
import {
  MODULES,
  MODULE_LABELS,
  sortModules,
  type ModuleValue,
} from "@/lib/admin-catalogs";
import { getOnboardingModulePreset } from "@/lib/onboarding/presets";
import type { OnboardingDraft } from "@/lib/onboarding/types";
import { Switch } from "@/components/atoms/switch";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<ModuleValue, typeof Layers> = {
  dashboard: Layers,
  crm: UserRoundPlus,
  bookings: CalendarDays,
  payments: CreditCard,
  billing: FileText,
  inventory: Package,
  finance: Wallet,
  whatsapp: MessageCircle,
  memberships: Repeat,
  orders: ShoppingCart,
  quotes: BadgeCheck,
};

const MODULE_DESCRIPTIONS: Record<ModuleValue, string> = {
  dashboard: "Tu tablero con lo esencial del día a día.",
  crm: "Clientes, fichas 360° y seguimiento.",
  bookings: "Reservas, citas y agenda.",
  payments: "Cobros y control de pagos.",
  billing: "Facturas para tus clientes.",
  inventory: "Productos, stock y reposiciones.",
  finance: "Gastos e ingresos en un solo lugar.",
  whatsapp: "Atiende y responde desde WhatsApp.",
  memberships: "Planes y membresías recurrentes.",
  orders: "Pedidos y ventas.",
  quotes: "Cotizaciones y presupuestos.",
};

/** Paso 3 — selección de módulos (preset recomendado + switches). */
export default function ModuleSelection({
  draft,
  onChange,
}: {
  draft: OnboardingDraft;
  onChange: (draft: OnboardingDraft) => void;
}) {
  const preset =
    draft.tenantType && draft.vertical
      ? getOnboardingModulePreset({
          tenantType: draft.tenantType,
          vertical: draft.vertical,
        })
      : [];

  const recommended = new Set(preset);
  const selected = new Set(draft.selectedModules);

  const toggle = (moduleName: ModuleValue) => {
    const next = new Set(selected);
    if (next.has(moduleName)) {
      next.delete(moduleName);
    } else {
      next.add(moduleName);
    }
    onChange({ ...draft, selectedModules: sortModules([...next]) });
  };

  return (
    <div className="space-y-4">
      {preset.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-gold-100 px-3 py-2.5 text-xs leading-5 text-gold-700">
          <Sparkles
            className="mt-0.5 size-4 shrink-0 text-gold-500"
            aria-hidden="true"
          />
          {selectWrapText(draft)}
        </p>
      )}

      <div className="grid gap-2.5">
        {MODULES.map((moduleName) => {
          const Icon = MODULE_ICONS[moduleName];
          const isSelected = selected.has(moduleName);
          const isRecommended = recommended.has(moduleName);
          return (
            <div
              key={moduleName}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition",
                isSelected
                  ? "border-gold-500 bg-card"
                  : "border-border bg-card opacity-75 hover:opacity-100",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-lg",
                  isSelected
                    ? "bg-gold-500/10 text-gold-700"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {MODULE_LABELS[moduleName]}
                  </p>
                  {isRecommended && (
                    <span className="rounded-sm bg-gold-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold-700 uppercase">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {MODULE_DESCRIPTIONS[moduleName]}
                </p>
              </div>
              <Switch
                checked={isSelected}
                onCheckedChange={() => toggle(moduleName)}
                aria-label={`Activar módulo ${MODULE_LABELS[moduleName]}`}
                className={cn(
                  isSelected && "data-[state=checked]:bg-gold-500",
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function selectWrapText(draft: OnboardingDraft): string {
  const base =
    draft.tenantType === "COMPANY"
      ? "Recomendamos estos módulos para tu empresa."
      : "Recomendamos estos módulos para tu perfil.";
  return `${base} Puedes activar o desactivar los que quieras.`;
}