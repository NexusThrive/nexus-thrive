import type { OnboardingFormState } from "../actions";

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
          className="text-sm font-medium text-slate-700"
        >
          Nombre del negocio <span className="text-rose-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaults.name}
          placeholder="Ej. Gimnasio Carlos Fitness"
          className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        {errors?.name && (
          <p className="mt-1 text-xs text-rose-600">{errors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="city"
          className="text-sm font-medium text-slate-700"
        >
          Ciudad / región <span className="text-rose-500">*</span>
        </label>
        <input
          id="city"
          name="city"
          type="text"
          defaultValue={defaults.city}
          placeholder="Ej. Bogotá"
          className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        {errors?.city && (
          <p className="mt-1 text-xs text-rose-600">{errors.city}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="whatsappNumber"
          className="text-sm font-medium text-slate-700"
        >
          WhatsApp (con indicativo) <span className="text-rose-500">*</span>
        </label>
        <input
          id="whatsappNumber"
          name="whatsappNumber"
          type="tel"
          defaultValue={defaults.whatsappNumber}
          placeholder="Ej. +57 300 123 4567"
          className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        {errors?.whatsappNumber && (
          <p className="mt-1 text-xs text-rose-600">{errors.whatsappNumber}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="tenantSlugDisplay"
          className="text-sm font-medium text-slate-700"
        >
          Dirección web de tu negocio
        </label>
        <div className="mt-1 flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
          <span aria-hidden="true">/</span>
          <input
            id="tenantSlugDisplay"
            value={tenantSlug}
            readOnly
            aria-label="Dirección del negocio (no editable)"
            className="w-full bg-transparent font-medium text-slate-900 focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Es la URL pública de tu negocio en NEXUS; se define una sola vez.
        </p>
      </div>
    </div>
  );
}