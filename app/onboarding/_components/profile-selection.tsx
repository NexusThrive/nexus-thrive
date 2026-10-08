import { Building2, User } from "lucide-react";
import type { OnboardingTenantType } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";

const PROFILES: {
  value: OnboardingTenantType;
  title: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    value: "INDIVIDUAL",
    title: "Emprendedor / Persona Natural",
    description:
      "Trabajas solo o con un equipo pequeño. Configuración liviana, sin NIT obligatorio.",
    icon: User,
  },
  {
    value: "COMPANY",
    title: "Empresa / Negocio Establecido",
    description:
      "Negocio formalizado con NIT, equipo y operación. Perfil completo de empresa.",
    icon: Building2,
  },
];

/** Paso 1 — selección de perfil (persona natural vs empresa). */
export default function ProfileSelection({
  value,
  onChange,
}: {
  value: OnboardingTenantType | null;
  onChange: (value: OnboardingTenantType) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Elige tu perfil de negocio</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {PROFILES.map((profile) => {
          const Icon = profile.icon;
          const isSelected = value === profile.value;
          return (
            <button
              key={profile.value}
              type="button"
              onClick={() => onChange(profile.value)}
              aria-pressed={isSelected}
              className={cn(
                "group rounded-xl border p-5 text-left transition",
                isSelected
                  ? "border-amber-400 bg-amber-50/60 ring-2 ring-amber-500/30"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-lg transition",
                  isSelected
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-3 block text-sm font-semibold text-slate-900">
                {profile.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {profile.description}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}