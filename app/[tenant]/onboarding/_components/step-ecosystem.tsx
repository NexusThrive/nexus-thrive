import type { OnboardingFormState } from "../actions";

export type EcosystemDefaults = {
  websiteUrl: string;
  googleBusinessUrl: string;
  instagramHandle: string;
};

const HELPERS: Record<
  string,
  { label: string; placeholder: string; helper: string; optional: boolean }
> = {
  websiteUrl: {
    label: "Sitio web",
    placeholder: "https://miegocio.com",
    helper: "Si no tienes todavía, puedes dejarlo vacío.",
    optional: true,
  },
  googleBusinessUrl: {
    label: "Ficha de Google Business",
    placeholder: "https://maps.app.goo.gl/…",
    helper: "La URL de tu negocio en Google Maps.",
    optional: true,
  },
  instagramHandle: {
    label: "Instagram",
    placeholder: "miegocio (sin @)",
    helper: "Solo el handle, sin la arroba.",
    optional: true,
  },
};

/**
 * Paso 3 — Ecosistema digital. Los tres campos son opcionales; el servidor
 * normaliza las URLs (agrega https://) y valida el handle de Instagram.
 */
export default function StepEcosystem({
  defaults,
  state,
}: {
  defaults: EcosystemDefaults;
  state: OnboardingFormState;
}) {
  const errors = state.status === "error" ? state.errors : undefined;
  const fields = ["websiteUrl", "googleBusinessUrl", "instagramHandle"] as const;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Conecta los canales que ya tienes. Todo es opcional: puedes agregarlo
        o cambiarlo más tarde desde Configuración.
      </p>

      {fields.map((field) => {
        const helper = HELPERS[field];
        const value = defaults[field];
        return (
          <div key={field}>
            <label
              htmlFor={field}
              className="text-sm font-medium text-slate-700"
            >
              {helper.label}{" "}
              {helper.optional && (
                <span className="font-normal text-slate-400">
                  (opcional)
                </span>
              )}
            </label>
            <input
              id={field}
              name={field}
              type="text"
              defaultValue={value}
              placeholder={helper.placeholder}
              className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <p className="mt-1 text-xs text-slate-500">{helper.helper}</p>
            {errors?.[field] && (
              <p className="mt-1 text-xs text-rose-600">{errors[field]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}