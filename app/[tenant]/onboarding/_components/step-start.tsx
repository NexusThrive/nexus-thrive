"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MAX_INITIAL_CUSTOMERS } from "../validators";
import type { OnboardingFormState } from "../actions";

/**
 * Paso 5 — Clientes iniciales (0 a 3, opcional). Las filas vacías se
 * ignoran en el servidor; los duplicados por teléfono/correo se descartan.
 */
export default function StepStart({
  state,
}: {
  state: OnboardingFormState;
}) {
  const [rows, setRows] = useState(1);
  const errors = state.status === "error" ? state.errors : undefined;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Opcional: agrega tus primeros clientes para que el panel ya tenga
        movimiento. Podrás importar más desde CRM.
      </p>

      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">
                Cliente {index + 1}
              </p>
              {rows > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((r) => r - 1)}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                  aria-label={`Quitar cliente ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar
                </button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label
                  htmlFor={`customerName-${index}`}
                  className="text-xs font-medium text-slate-600"
                >
                  Nombre
                </label>
                <input
                  id={`customerName-${index}`}
                  name="customerName"
                  type="text"
                  placeholder="Ej. Laura Gómez"
                  className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label
                  htmlFor={`customerPhone-${index}`}
                  className="text-xs font-medium text-slate-600"
                >
                  Teléfono
                </label>
                <input
                  id={`customerPhone-${index}`}
                  name="customerPhone"
                  type="tel"
                  placeholder="+57 300 123 4567"
                  className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label
                  htmlFor={`customerEmail-${index}`}
                  className="text-xs font-medium text-slate-600"
                >
                  Correo (opcional)
                </label>
                <input
                  id={`customerEmail-${index}`}
                  name="customerEmail"
                  type="email"
                  placeholder="laura@correo.com"
                  className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {rows < MAX_INITIAL_CUSTOMERS && (
        <button
          type="button"
          onClick={() => setRows((r) => r + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Agregar otro cliente
        </button>
      )}

      {errors?.customers && (
        <p className="text-xs text-rose-600">{errors.customers}</p>
      )}
    </div>
  );
}