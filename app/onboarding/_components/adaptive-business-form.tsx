"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Loader2, MapPin, Receipt } from "lucide-react";
import { checkSlugAvailabilityAction, type SlugAvailability } from "@/app/onboarding/actions";
import type { VerticalValue } from "@/lib/core/sectors/verticals";
import { normalizeSlug, normalizeAndValidateSlug } from "@/lib/core/tenancy/onboarding/slug";
import {
  TEAM_SIZES,
  TEAM_SIZE_LABELS,
  type OnboardingDraft,
  type OnboardingFieldErrors,
} from "@/lib/core/tenancy/onboarding/types";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Field } from "@/components/molecules/field";
import { cn } from "@/lib/utils";
import { AddressAutocomplete } from "./address-autocomplete";

type FieldProps = {
  /** Rubros habilitados para registrarse (catálogo del Operations Center). */
  verticals: { value: VerticalValue; label: string }[];
  draft: OnboardingDraft;
  /** Aplica un cambio parcial sobre el borrador MÁS RECIENTE (no sobre `draft`),
   *  así varios cambios en el mismo instante (autocompletado) no se pisan. */
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  errors: OnboardingFieldErrors;
  showErrors: boolean;
  /** Negocio que se está completando (su propio enlace cuenta como libre). */
  tenantId?: string;
  /** Avisa si el enlace escrito ya lo usa otro negocio (bloquea continuar). */
  onSlugTaken?: (taken: boolean) => void;
};

/** Campo con icono a la izquierda. */
function IconInput({ icon: Icon, className, ...props }: React.ComponentProps<"input"> & { icon: typeof MapPin }) {
  return (
    <div className="relative">
      <Icon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input {...props} className={cn(inputClasses, "pl-9", className)} />
    </div>
  );
}

/**
 * Paso "Tu negocio": nombre, enlace, rubro y equipo; razón social, NIT y dirección son opcionales en cualquier etapa. El
 * enlace se arma solo desde el nombre hasta que el usuario lo edita, y la
 * vista previa del panel de marca refleja cada cambio en vivo.
 */
export default function AdaptiveBusinessForm({ verticals, draft, onPatch: patch, errors, showErrors, tenantId, onSlugTaken }: FieldProps) {
  const [slugTouched, setSlugTouched] = useState(() => draft.slugRaw.length > 0);
  const slugCheck = normalizeAndValidateSlug(draft.slugRaw);
  // Disponibilidad en vivo: se consulta 400 ms después de la última tecla y solo si el enlace ya es válido.
  const [availability, setAvailability] = useState<(SlugAvailability & { slug: string }) | null>(null);
  const slugValue = slugCheck.ok ? slugCheck.slug : null;
  useEffect(() => {
    if (!slugValue) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      checkSlugAvailabilityAction(slugValue, tenantId)
        .then((result) => { if (!cancelled) setAvailability({ ...result, slug: slugValue }); })
        .catch(() => { if (!cancelled) setAvailability(null); });
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [slugValue, tenantId]);
  const checking = Boolean(slugValue) && availability?.slug !== slugValue;
  const taken = Boolean(slugValue) && availability?.slug === slugValue && !availability.available;
  const suggestion = taken ? availability?.suggestion : undefined;
  useEffect(() => { onSlugTaken?.(taken); }, [taken, onSlugTaken]);
  const err = (key: keyof OnboardingFieldErrors) => (showErrors ? errors[key] : undefined);

  const slugError = taken
    ? "Ese enlace ya está en uso por otro negocio."
    : showErrors && (errors.slug || (!slugCheck.ok && draft.slugRaw.length > 0))
      ? (errors.slug ?? (!slugCheck.ok ? slugCheck.error : undefined))
      : undefined;

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nombre comercial" required error={err("name") ?? (taken && !slugTouched ? "Ya existe un negocio con ese nombre. Cambia el nombre o elige otro enlace." : undefined)}>
          {(control) => (
            <input
              {...control}
              autoFocus
              className={inputClasses}
              value={draft.name}
              onChange={(event) => {
                const name = event.target.value;
                patch(slugTouched ? { name } : { name, slugRaw: normalizeSlug(name) });
              }}
              placeholder="Nombre de tu negocio"
              maxLength={80}
              autoComplete="organization"
            />
          )}
        </Field>
        {(
          <Field label="Razón social" hint="Opcional" error={err("legalName")}>
            {(control) => (
              <input
                {...control}
                className={inputClasses}
                value={draft.legalName}
                onChange={(event) => patch({ legalName: event.target.value })}
                placeholder="Razón social"
                maxLength={120}
              />
            )}
          </Field>
        )}
      </div>

      <Field
        label="Tu enlace en NEXUS"
        required
        error={slugError}
        hint="Sin espacios ni mayúsculas: letras, números y guiones."
      >
        {(control) => (
          <div className={cn(inputClasses, "flex items-center gap-2 px-3 focus-within:border-ring focus-within:shadow-[0_0_0_3px_rgba(212,175,55,0.18)]")}>
            <Link2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="shrink-0 text-sm text-muted-foreground">nexusthrive.com.co/</span>
            <input
              {...control}
              value={draft.slugRaw}
              onChange={(event) => {
                setSlugTouched(true);
                patch({ slugRaw: event.target.value });
              }}
              placeholder="mi-negocio"
              className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              maxLength={48}
              autoComplete="off"
            />
            {checking ? <Loader2 aria-label="Comprobando disponibilidad" className="size-4 shrink-0 animate-spin text-muted-foreground" /> : slugCheck.ok && !taken ? <Check aria-label="Enlace disponible" className="size-4 shrink-0 text-success" /> : null}
          </div>
        )}
      </Field>

      {suggestion ? (
        <button
          type="button"
          onClick={() => { setSlugTouched(true); patch({ slugRaw: suggestion }); }}
          className="-mt-3 justify-self-start rounded-sm text-ui font-medium text-accent-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Usar «{suggestion}»
        </button>
      ) : null}

      <Field label="Rubro principal" required error={err("vertical")}>
        {(control) => (
          <Select {...control} value={draft.vertical ?? ""} onChange={(event) => patch({ vertical: (event.target.value || null) as VerticalValue | null })}>
            <option value="">Elige tu rubro</option>
            {verticals.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {(
        <div>
          <p className="mb-2 text-[13px] font-medium">
            Tamaño del equipo <span className="text-muted-foreground">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TEAM_SIZES.map((size) => {
              const selected = draft.teamSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={selected}
                  data-press=""
                  onClick={() => patch({ teamSize: size })}
                  className={cn(
                    "rounded-md border px-3 py-2 text-center text-[12.5px] font-medium leading-tight transition-[border-color,background-color,box-shadow] duration-200",
                    selected
                      ? "border-accent bg-accent-subtle/60 shadow-[0_0_0_3px_rgba(212,175,55,.18)]"
                      : "border-border-input bg-surface hover:border-border-input-hover",
                  )}
                >
                  {TEAM_SIZE_LABELS[size]}
                </button>
              );
            })}
          </div>
          {err("teamSize") ? <p className="mt-2 text-xs text-danger">{err("teamSize")}</p> : null}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="NIT / RUT" hint="Opcional: puedes agregarlo cuando factures." error={err("taxId")} className="sm:col-span-2">
          {(control) => (
            <IconInput
              {...control}
              icon={Receipt}
              value={draft.taxId}
              onChange={(event) => patch({ taxId: event.target.value })}
              placeholder="Número de NIT"
              maxLength={20}
              inputMode="numeric"
              autoComplete="off"
            />
          )}
        </Field>
        <Field
          label="Dirección o ubicación"
          hint="Opcional. Escribe REMOTE si trabajas sin local físico."
          error={err("address")}
          className="sm:col-span-2"
        >
          {(control) => (
            <AddressAutocomplete
              id={control.id}
              ariaDescribedBy={control["aria-describedby"]}
              ariaInvalid={control["aria-invalid"]}
              value={draft.address}
              location={
                draft.latitude != null && draft.longitude != null
                  ? { latitude: draft.latitude, longitude: draft.longitude }
                  : null
              }
              onChange={(change) =>
                patch({
                  address: change.address,
                  latitude: change.latitude,
                  longitude: change.longitude,
                  placeId: change.placeId,
                  ...(change.city ? { city: change.city } : {}),
                })
              }
              placeholder="Calle y número"
            />
          )}
        </Field>
      </div>
    </div>
  );
}
