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
    <fieldset className="flex min-w-0 flex-1 flex-col justify-center">
      <legend className="sr-only">Elige tu perfil de negocio</legend>
      <div className="grid flex-1 auto-rows-fr gap-4 sm:flex-none sm:auto-rows-auto sm:grid-cols-2">
        {PROFILES.map((profile) => {
          const Icon = profile.icon;
          const isSelected = value === profile.value;
          return (
            <button
              key={profile.value}
              type="button"
              onClick={() => onChange(profile.value)}
              aria-pressed={isSelected}
              data-press="card"
              className={cn(
                "group flex flex-col justify-center rounded-lg border p-5 text-left transition-[border-color,background-color,box-shadow] duration-200 sm:min-h-[240px] sm:p-6",
                isSelected
                  ? "border-accent bg-accent-subtle/60 shadow-[0_0_0_3px_rgba(212,175,55,.18)]"
                  : "border-border-input bg-surface hover:border-border-input-hover",
              )}
            >
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-lg transition sm:size-10",
                  isSelected
                    ? "bg-accent text-ink"
                    : "bg-surface-muted text-muted-foreground group-hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-3 block text-[15px] font-semibold text-foreground">
                {profile.title}
              </span>
              <span className="mt-1 block text-[13px] leading-5 text-muted-foreground">
                {profile.description}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}