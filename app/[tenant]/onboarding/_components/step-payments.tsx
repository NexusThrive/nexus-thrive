"use client";

import { useState } from "react";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethodValue,
} from "@/lib/admin-catalogs";
import type { OnboardingFormState } from "../actions";

/**
 * Paso 4 — Métodos de pago aceptados. Se exige al menos uno (catálogo de
 * la plataforma). La selección local alimenta un resumen por fila; el
 * servidor vuelve a validar con `isPaymentMethod`.
 */
export default function StepPayments({
  current,
  state,
}: {
  current: PaymentMethodValue[];
  state: OnboardingFormState;
}) {
  const [selected, setSelected] = useState<PaymentMethodValue[]>(
    current.length > 0 ? current : [],
  );
  const errors = state.status === "error" ? state.errors : undefined;

  function toggle(value: PaymentMethodValue) {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-foreground/80">
          ¿Cómo recibirás pagos? <span className="text-destructive">*</span>
        </legend>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Selecciona al menos uno. Puedes cambiarlos después.
        </p>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PAYMENT_METHODS.map((value) => {
            const checked = selected.includes(value);
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
                  type="checkbox"
                  name="paymentMethods"
                  value={value}
                  checked={checked}
                  onChange={() => toggle(value)}
                  className="h-4 w-4 rounded border-foreground/20 accent-gold-600"
                />
                {PAYMENT_METHOD_LABELS[value]}
              </label>
            );
          })}
        </div>

        {errors?.paymentMethods ? (
          <p className="mt-1 text-xs text-destructive">
            {errors.paymentMethods}
          </p>
        ) : selected.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Aún no hay métodos seleccionados.
          </p>
        ) : (
          <p className="mt-1 text-xs text-success">
            {selected.length}{" "}
            {selected.length === 1
              ? "método seleccionado"
              : "métodos seleccionados"}
            .
          </p>
        )}
      </fieldset>
    </div>
  );
}