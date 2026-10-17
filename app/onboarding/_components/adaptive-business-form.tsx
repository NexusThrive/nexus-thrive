"use client";

import { useState } from "react";
import { Check, Link2, MapPin, MapPinned, Receipt } from "lucide-react";
import { VERTICALS, VERTICAL_LABELS, type VerticalValue } from "@/lib/admin-catalogs";
import { getVerticalIcon } from "@/lib/admin/vertical-icons";
import { normalizeSlug, normalizeAndValidateSlug } from "@/lib/onboarding/slug";
import {
  TEAM_SIZES,
  TEAM_SIZE_LABELS,
  type OnboardingDraft,
  type OnboardingFieldErrors,
  type TeamSizeValue,
} from "@/lib/onboarding/types";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { cn } from "@/lib/utils";

type FieldProps = {
  draft: OnboardingDraft;
  /** Aplica un cambio parcial sobre el borrador MÁS RECIENTE (no sobre `draft`),
   *  así varios cambios en el mismo instante (autocompletado) no se pisan. */
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  errors: OnboardingFieldErrors;
  showErrors: boolean;
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
 * Paso "Tu negocio": formulario adaptativo (persona natural vs empresa). El
 * enlace se arma solo desde el nombre hasta que el usuario lo edita, y la
 * vista previa del panel de marca refleja cada cambio en vivo.
 */
export default function AdaptiveBusinessForm({ draft, onPatch: patch, errors, showErrors }: FieldProps) {
  const [slugTouched, setSlugTouched] = useState(() => draft.slugRaw.length > 0);
  const isCompany = draft.tenantType === "COMPANY";
  const slugCheck = normalizeAndValidateSlug(draft.slugRaw);
  const err = (key: keyof OnboardingFieldErrors) => (showErrors ? errors[key] : undefined);

  const slugError =
    showErrors && (errors.slug || (!slugCheck.ok && draft.slugRaw.length > 0))
      ? (errors.slug ?? (!slugCheck.ok ? slugCheck.error : undefined))
      : undefined;

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nombre comercial" required error={err("name")} className={isCompany ? undefined : "sm:col-span-2"}>
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
              placeholder={isCompany ? "Ej. Constructora Castellar" : "Ej. Barbería El Caballero"}
              maxLength={80}
              autoComplete="organization"
            />
          )}
        </Field>
        {isCompany ? (
          <Field label="Razón social" hint="Opcional" error={err("legalName")}>
            {(control) => (
              <input
                {...control}
                className={inputClasses}
                value={draft.legalName}
                onChange={(event) => patch({ legalName: event.target.value })}
                placeholder="Ej. Castellar Construcciones S.A.S."
                maxLength={120}
              />
            )}
          </Field>
        ) : null}
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
            <span className="shrink-0 text-sm text-muted-foreground">nexusthrive.co/</span>
            <input
              {...control}
              value={draft.slugRaw}
              onChange={(event) => {
                setSlugTouched(true);
                patch({ slugRaw: event.target.value });
              }}
              placeholder="mi-marca"
              className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              maxLength={48}
              autoComplete="off"
            />
            {slugCheck.ok ? <Check aria-label="Enlace válido" className="size-4 shrink-0 text-success" /> : null}
          </div>
        )}
      </Field>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-[13px] font-medium">
          Rubro del negocio <span className="text-muted-foreground">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VERTICALS.map((vertical) => {
            const { icon: Icon } = getVerticalIcon(vertical);
            const selected = draft.vertical === vertical;
            return (
              <button
                key={vertical}
                type="button"
                aria-pressed={selected}
                data-press=""
                onClick={() => patch({ vertical: vertical as VerticalValue })}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-[border-color,background-color,box-shadow] duration-200",
                  selected
                    ? "border-accent bg-accent-subtle/60 shadow-[0_0_0_3px_rgba(212,175,55,.18)]"
                    : "border-border-input bg-surface hover:border-border-input-hover",
                )}
              >
                <Icon aria-hidden="true" className={cn("size-4 shrink-0", selected ? "text-accent-text" : "text-muted-foreground")} />
                <span className="min-w-0 text-[12.5px] font-medium leading-tight">{VERTICAL_LABELS[vertical]}</span>
              </button>
            );
          })}
        </div>
        {err("vertical") ? <p className="mt-2 text-xs text-danger">{err("vertical")}</p> : null}
      </fieldset>

      {isCompany ? (
        <div>
          <p className="mb-2 text-[13px] font-medium">
            Tamaño del equipo <span className="text-muted-foreground">*</span>
          </p>
          <SegmentedControl
            ariaLabel="Tamaño del equipo"
            value={(draft.teamSize ?? "") as TeamSizeValue}
            onChange={(teamSize) => patch({ teamSize })}
            options={TEAM_SIZES.map((size) => ({ value: size as TeamSizeValue, label: TEAM_SIZE_LABELS[size as TeamSizeValue] }))}
          />
          {err("teamSize") ? <p className="mt-2 text-xs text-danger">{err("teamSize")}</p> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="NIT / RUT" required={isCompany} hint={isCompany ? undefined : "Opcional"} error={err("taxId")}>
          {(control) => (
            <IconInput
              {...control}
              icon={Receipt}
              value={draft.taxId}
              onChange={(event) => patch({ taxId: event.target.value })}
              placeholder="Ej. 901.234.567-9"
              maxLength={20}
              inputMode="numeric"
              autoComplete="off"
            />
          )}
        </Field>
        <Field label="Ciudad" required error={err("city")}>
          {(control) => (
            <IconInput
              {...control}
              icon={MapPin}
              value={draft.city}
              onChange={(event) => patch({ city: event.target.value })}
              placeholder="Ej. Bogotá"
              maxLength={80}
              autoComplete="address-level2"
            />
          )}
        </Field>
        {isCompany ? (
          <Field
            label="Dirección del local"
            required
            hint="Escribe REMOTE si no tienes un local físico."
            error={err("address")}
            className="sm:col-span-2"
          >
            {(control) => (
              <IconInput
                {...control}
                icon={MapPinned}
                value={draft.address}
                onChange={(event) => patch({ address: event.target.value })}
                placeholder="Ej. Cra 7 # 72-41"
                maxLength={200}
              />
            )}
          </Field>
        ) : null}
      </div>
    </div>
  );
}
