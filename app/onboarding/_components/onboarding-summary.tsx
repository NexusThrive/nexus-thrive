"use client";

import {
  Building2,
  Check,
  CreditCard,
  MapPin,
  Store,
  User,
} from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { VERTICAL_LABELS, sortModules } from "@/lib/admin-catalogs";
import {
  TEAM_SIZE_LABELS,
  type OnboardingActionResult,
  type OnboardingDraft,
  type OnboardingPrefill,
} from "@/lib/onboarding/types";

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

/** Paso 4 — resumen y finalización del onboarding. */
export default function OnboardingSummary({
  prefill,
  draft,
  actionResult,
  isPending,
  onSubmit,
}: {
  prefill: OnboardingPrefill;
  draft: OnboardingDraft;
  actionResult: OnboardingActionResult | null;
  isPending: boolean;
  onSubmit: () => void;
}) {
  const vertical = draft.vertical;
  const verticalLabel = vertical ? VERTICAL_LABELS[vertical] : "—";
  const modules = sortModules(draft.selectedModules);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">
          {prefill.mode === "resume"
            ? "Tu espacio queda así"
            : "Tu espacio NEXUS queda así"}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Revisa los datos y finaliza: podrás cambiarlos después desde tu
          espacio.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SummaryRow
            icon={draft.tenantType === "COMPANY" ? Building2 : User}
            label="Perfil"
            value={draft.tenantType === "COMPANY" ? "Empresa" : "Persona natural"}
          />
          <SummaryRow icon={Store} label="Nombre" value={draft.name} />
          {draft.legalName && (
            <SummaryRow icon={Building2} label="Razón social" value={draft.legalName} />
          )}
          {draft.taxId && (
            <SummaryRow icon={CreditCard} label="NIT / RUT" value={draft.taxId} />
          )}
          <SummaryRow icon={Store} label="Rubro" value={verticalLabel} />
          {draft.teamSize && (
            <SummaryRow
              icon={User}
              label="Equipo"
              value={TEAM_SIZE_LABELS[draft.teamSize] ?? draft.teamSize}
            />
          )}
          {draft.address && (
            <SummaryRow icon={MapPin} label="Dirección" value={draft.address} />
          )}
          <SummaryRow icon={MapPin} label="Ciudad" value={draft.city || "—"} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Módulos activos
          </h3>
          <span className="rounded-sm bg-gold-100 px-2 py-0.5 text-xs font-semibold text-gold-700">
            {modules.length}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {modules.map((moduleName) => (
            <span
              key={moduleName}
              className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80"
            >
              <Check className="size-3 text-gold-500" aria-hidden="true" />
              {moduleLabel(moduleName)}
            </span>
          ))}
        </div>
      </div>

      {actionResult?.status === "error" && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {actionResult.message}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <NLoader size={16} className="text-current" />
            Configurando tu espacio…
          </>
        ) : prefill.mode === "resume" ? (
          <>Guardar cambios y finalizar</>
        ) : (
          <>Crear mi espacio NEXUS</>
        )}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Al finalizar aceptas que este espacio se abra con tu cuenta como
        administrador.
      </p>
    </div>
  );
}

function moduleLabel(moduleName: string): string {
  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    crm: "CRM",
    bookings: "Reservas",
    payments: "Pagos",
    billing: "Facturación",
    inventory: "Inventario",
    finance: "Finanzas",
    whatsapp: "WhatsApp",
    memberships: "Membresías",
    orders: "Pedidos",
    quotes: "Cotizaciones",
  };
  return labels[moduleName] ?? moduleName;
}