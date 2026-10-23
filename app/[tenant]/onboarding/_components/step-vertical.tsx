"use client";

import { useState } from "react";
import {
  DEFAULT_MODULES_BY_VERTICAL,
  MODULE_LABELS,
  VERTICAL_LABELS,
  VERTICALS,
  type VerticalValue,
} from "@/lib/admin/catalogs";
import { getVerticalTerms } from "@/lib/vertical-terms";
import type { OnboardingFormState } from "../actions";

/**
 * Paso 2 — Vertical del negocio. El resumen de módulos y la terminología
 * se leen SIEMPRE de los catálogos de la plataforma (nunca de un input
 * libre): el servidor vuelve a validar contra `isVertical`.
 */
export default function StepVertical({
  current,
  state,
}: {
  current: VerticalValue;
  state: OnboardingFormState;
}) {
  const [vertical, setVertical] = useState<VerticalValue>(current);
  const errors = state.status === "error" ? state.errors : undefined;

  const selected = VERTICALS.includes(vertical) ? vertical : VERTICALS[0];
  const modules = DEFAULT_MODULES_BY_VERTICAL[selected];

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-foreground/80">
          ¿Cuál es tu tipo de negocio?{" "}
          <span className="text-destructive">*</span>
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {VERTICALS.map((value) => {
            const label = VERTICAL_LABELS[value];
            const checked = vertical === value;
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                  checked
                    ? "border-gold-500 bg-accent-subtle text-accent-text"
                    : "border-border bg-card text-foreground/80 hover:border-foreground/20 hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="vertical"
                  value={value}
                  checked={checked}
                  onChange={() => setVertical(value)}
                  className="h-4 w-4 accent-gold-600"
                />
                {label}
              </label>
            );
          })}
        </div>
        {errors?.vertical && (
          <p className="mt-1 text-xs text-destructive">{errors.vertical}</p>
        )}
      </fieldset>

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Terminología principal
        </p>
        <p className="mt-0.5 text-sm text-foreground/80">
          {(() => {
            const terms = getVerticalTerms(selected);
            return `${terms.customer} · ${terms.booking} · ${terms.items}`;
          })()}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Módulos que activaremos automáticamente
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {modules.map((moduleName) => (
            <span
              key={moduleName}
              className="inline-flex items-center rounded-sm bg-gold-100 px-2.5 py-0.5 text-xs font-medium text-accent-text"
            >
              {MODULE_LABELS[moduleName]}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Podrás activar otros módulos después desde el panel del CEO.
        </p>
      </div>
    </div>
  );
}