"use client";

import { useState } from "react";
import { Check, Link2, MapPin, MapPinned, Receipt, Users } from "lucide-react";
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
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  draft: OnboardingDraft;
  onChange: (draft: OnboardingDraft) => void;
  errors: OnboardingFieldErrors;
  showErrors: boolean;
};

function FieldError({
  show,
  message,
}: {
  show: boolean;
  message?: string;
}) {
  if (!show || !message) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

/** Paso 2 — formulario adaptativo según perfil (persona natural vs empresa). */
export default function AdaptiveBusinessForm({
  draft,
  onChange,
  errors,
  showErrors,
}: FieldProps) {
  const [slugTouched, setSlugTouched] = useState(() => draft.slugRaw.length > 0);

  const isCompany = draft.tenantType === "COMPANY";
  const slugCheck = normalizeAndValidateSlug(draft.slugRaw);

  const patch = (partial: Partial<OnboardingDraft>) =>
    onChange({ ...draft, ...partial });

  const handleNameChange = (name: string) => {
    // Auto-slug mientras el usuario no haya personalizado el enlace.
    if (!slugTouched) {
      patch({ name, slugRaw: normalizeSlug(name) });
    } else {
      patch({ name });
    }
  };

  return (
    <div className="space-y-5">
      {/* Nombre comercial */}
      <div>
        <Label htmlFor="onboarding-name">Nombre comercial</Label>
        <Input
          id="onboarding-name"
          value={draft.name}
          onChange={(event) => handleNameChange(event.target.value)}
          placeholder={isCompany ? "Ej. Constructora Castellar" : "Ej. Barbería El Caballero"}
          maxLength={80}
          autoComplete="organization"
        />
        <FieldError show={showErrors} message={errors.name} />
      </div>

      {/* Razón social (solo empresa, opcional) */}
      {isCompany && (
        <div>
          <Label htmlFor="onboarding-legal-name">
            Razón social <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="onboarding-legal-name"
            value={draft.legalName}
            onChange={(event) => patch({ legalName: event.target.value })}
            placeholder="Ej. Castellar Construcciones S.A.S."
            maxLength={120}
          />
          <FieldError show={showErrors} message={errors.legalName} />
        </div>
      )}

      {/* NIT / RUT */}
      <div>
        <Label htmlFor="onboarding-tax-id">
          NIT / RUT
          {!isCompany && (
            <span className="font-normal text-muted-foreground"> (opcional)</span>
          )}
        </Label>
        <div className="relative">
          <Receipt
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="onboarding-tax-id"
            value={draft.taxId}
            onChange={(event) => patch({ taxId: event.target.value })}
            placeholder="Ej. 901.234.567-9"
            maxLength={20}
            inputMode="numeric"
            className="pl-9"
            autoComplete="off"
          />
        </div>
        <FieldError show={showErrors} message={errors.taxId} />
      </div>

      {/* Slug / enlace */}
      <div>
        <Label htmlFor="onboarding-slug">Tu enlace en NEXUS</Label>
        <div className="flex items-center gap-2 rounded-md border border-input bg-muted px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="shrink-0 text-sm text-muted-foreground">
            nexusthrive.co/
          </span>
          <input
            id="onboarding-slug"
            value={draft.slugRaw}
            onChange={(event) => {
              setSlugTouched(true);
              patch({ slugRaw: event.target.value });
            }}
            placeholder="mi-marca"
            className="h-9 w-full min-w-0 bg-transparent pr-2 text-sm outline-none placeholder:text-muted-foreground"
            maxLength={48}
            autoComplete="off"
          />
          {slugCheck.ok && (
            <Check
              className="size-4 shrink-0 text-success"
              aria-label="Enlace válido"
            />
          )}
        </div>
        {showErrors &&
          (errors.slug ||
            (!slugCheck.ok && draft.slugRaw.length > 0)) && (
            <FieldError
              show={true}
              message={
                errors.slug ?? (!slugCheck.ok ? slugCheck.error : undefined)
              }
            />
          )}
        <p className="mt-1 text-xs text-muted-foreground">
          Sin espacios ni mayúsculas. Solo letras, números y guiones.
        </p>
      </div>

      {/* Vertical */}
      <div>
        <Label>Rubro del negocio</Label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {VERTICALS.map((vertical) => {
            const visual = getVerticalIcon(vertical);
            const Icon = visual.icon;
            const isSelected = draft.vertical === vertical;
            return (
              <button
                key={vertical}
                type="button"
                onClick={() =>
                  patch({
                    vertical: vertical as VerticalValue,
                  })
                }
                aria-pressed={isSelected}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition",
                  isSelected
                    ? "border-gold-500 bg-gold-100/60 ring-2 ring-gold-600/30"
                    : "border-border bg-card hover:border-foreground/20 hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-md",
                    visual.chipClass,
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 text-xs leading-tight font-medium text-foreground/80">
                  {VERTICAL_LABELS[vertical]}
                </span>
              </button>
            );
          })}
        </div>
        <FieldError show={showErrors} message={errors.vertical} />
      </div>

      {/* Tamaño de equipo (solo empresa) */}
      {isCompany && (
        <div>
          <Label>Tamaño del equipo</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TEAM_SIZES.map((size) => {
              const value = size as unknown as TeamSizeValue;
              const isSelected = draft.teamSize === value;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => patch({ teamSize: value })}
                  aria-pressed={isSelected}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium transition",
                    isSelected
                      ? "border-gold-500 bg-gold-100 text-gold-700 ring-2 ring-gold-600/20"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:bg-muted",
                  )}
                >
                  <Users
                    className="size-3.5"
                    aria-hidden="true"
                    strokeWidth={2}
                  />
                  {TEAM_SIZE_LABELS[value]}
                </button>
              );
            })}
          </div>
          <FieldError show={showErrors} message={errors.teamSize} />
        </div>
      )}

      {/* Dirección (solo empresa) */}
      {isCompany && (
        <div>
          <Label htmlFor="onboarding-address">Dirección del local</Label>
          <div className="relative">
            <MapPinned
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="onboarding-address"
              value={draft.address}
              onChange={(event) => patch({ address: event.target.value })}
              placeholder="Ej. Cra 7 # 72-41, Bogotá"
              maxLength={200}
              className="pl-9"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Escribe REMOTE si no tienes un local físico.
          </p>
          <FieldError show={showErrors} message={errors.address} />
        </div>
      )}

      {/* Ciudad */}
      <div>
        <Label htmlFor="onboarding-city">Ciudad</Label>
        <div className="relative">
          <MapPin
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="onboarding-city"
            value={draft.city}
            onChange={(event) => patch({ city: event.target.value })}
            placeholder="Ej. Bogotá"
            maxLength={80}
            className="pl-9"
            autoComplete="address-level2"
          />
        </div>
        <FieldError show={showErrors} message={errors.city} />
      </div>
    </div>
  );
}