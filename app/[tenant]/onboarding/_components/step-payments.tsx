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
        <legend className="text-sm font-medium text-slate-700">
          ¿Cómo recibirás pagos? <span className="text-rose-500">*</span>
        </legend>
        <p className="mt-0.5 text-xs text-slate-500">
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
                    ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  name="paymentMethods"
                  value={value}
                  checked={checked}
                  onChange={() => toggle(value)}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />
                {PAYMENT_METHOD_LABELS[value]}
              </label>
            );
          })}
        </div>

        {errors?.paymentMethods ? (
          <p className="mt-1 text-xs text-rose-600">
            {errors.paymentMethods}
          </p>
        ) : selected.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            Aún no hay métodos seleccionados.
          </p>
        ) : (
          <p className="mt-1 text-xs text-emerald-600">
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