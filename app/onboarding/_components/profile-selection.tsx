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
              data-press="card"
              className={cn(
                "group rounded-lg border p-5 text-left transition",
                isSelected
                  ? "border-gold-500 bg-gold-100/60 ring-2 ring-gold-600/30"
                  : "border-border bg-card hover:border-foreground/20 hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-lg transition",
                  isSelected
                    ? "bg-gold-500 text-ink"
                    : "bg-muted text-muted-foreground group-hover:bg-foreground/10",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-3 block text-sm font-semibold text-foreground">
                {profile.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {profile.description}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}