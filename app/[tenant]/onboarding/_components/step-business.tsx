import type { OnboardingFormState } from "../actions";
import { inputClasses } from "@/components/atoms/input";

export type StepDefaults = {
  name: string;
  city: string;
  whatsappNumber: string;
};

/**
 * Paso 1 — Identidad del negocio y ubicación.
 * El slug se muestra pero NO se puede editar (es la URL pública del tenant).
 */
export default function StepBusiness({
  tenantSlug,
  defaults,
  state,
}: {
  tenantSlug: string;
  defaults: StepDefaults;
  state: OnboardingFormState;
}) {
  const errors = state.status === "error" ? state.errors : undefined;

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="text-sm font-medium text-foreground/80"
        >
          Nombre del negocio <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaults.name}
          placeholder="Ej. Gimnasio Carlos Fitness"
          className={`mt-1 ${inputClasses}`}
        />
        {errors?.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="city"
          className="text-sm font-medium text-foreground/80"
        >
          Ciudad / región <span className="text-destructive">*</span>
        </label>
        <input
          id="city"
          name="city"
          type="text"
          defaultValue={defaults.city}
          placeholder="Ej. Bogotá"
          className={`mt-1 ${inputClasses}`}
        />
        {errors?.city && (
          <p className="mt-1 text-xs text-destructive">{errors.city}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="whatsappNumber"
          className="text-sm font-medium text-foreground/80"
        >
          WhatsApp (con indicativo) <span className="text-destructive">*</span>
        </label>
        <input
          id="whatsappNumber"
          name="whatsappNumber"
          type="tel"
          defaultValue={defaults.whatsappNumber}
          placeholder="Ej. +57 300 123 4567"
          className={`mt-1 ${inputClasses}`}
        />
        {errors?.whatsappNumber && (
          <p className="mt-1 text-xs text-destructive">{errors.whatsappNumber}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="tenantSlugDisplay"
          className="text-sm font-medium text-foreground/80"
        >
          Dirección web de tu negocio
        </label>
        <div className="mt-1 flex h-10 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground">
          <span aria-hidden="true">/</span>
          <input
            id="tenantSlugDisplay"
            value={tenantSlug}
            readOnly
            aria-label="Dirección del negocio (no editable)"
            className="w-full bg-transparent font-medium text-foreground focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Es la URL pública de tu negocio en NEXUS; se define una sola vez.
        </p>
      </div>
    </div>
  );
}