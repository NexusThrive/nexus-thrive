"use client";

import { useEffect, useActionState, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { createExpenseAction, type ExpenseFormState } from "../actions";
import { EXPENSE_CATEGORIES } from "@/lib/finance";

const IDLE_STATE: ExpenseFormState = { status: "idle" };

/**
 * Modal de registro de gasto de caja menor. Estado manejado por el Server
 * Action vía `useActionState`; al confirmar cierra y revalida las vistas.
 */
export default function ExpenseForm({
  tenantSlug,
  onClose,
}: {
  tenantSlug: string;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createExpenseAction,
    IDLE_STATE,
  );

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (state.status === "ok") {
      onClose();
    }
  }, [state, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, isPending]);

  const errors = state.errors ?? {};
  const categoryValue = state.values?.category ?? EXPENSE_CATEGORIES[0];
  const descriptionValue = state.values?.description ?? "";
  const amountValue = state.values?.amount ?? "";

  const fieldClass = (hasError: boolean) =>
    [
      "mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:outline-2",
      hasError
        ? "border-rose-300 focus:border-rose-400 focus:outline-rose-500/30"
        : "border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:outline-indigo-500/30",
    ].join(" ");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={() => !isPending && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-form-title"
        className="relative mt-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:mt-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="expense-form-title"
              className="text-lg font-semibold text-slate-900"
            >
              Registrar gasto
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Anota una salida de caja menor del negocio.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={isPending}
            onClick={onClose}
            className="-m-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4" noValidate>
          <input type="hidden" name="tenantSlug" value={tenantSlug} />

          <div>
            <label
              htmlFor="expense-description"
              className="text-sm font-medium text-slate-700"
            >
              Concepto <span className="text-rose-500">*</span>
            </label>
            <input
              id="expense-description"
              name="description"
              defaultValue={descriptionValue}
              autoFocus
              aria-invalid={Boolean(errors.description)}
              placeholder="Ej. Recarga de internet"
              className={fieldClass(Boolean(errors.description))}
            />
            {errors.description ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.description}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="expense-category"
              className="text-sm font-medium text-slate-700"
            >
              Categoría <span className="text-rose-500">*</span>
            </label>
            <select
              id="expense-category"
              name="category"
              defaultValue={categoryValue}
              aria-invalid={Boolean(errors.category)}
              className={fieldClass(Boolean(errors.category))}
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.category}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="expense-amount"
              className="text-sm font-medium text-slate-700"
            >
              Monto (COP) <span className="text-rose-500">*</span>
            </label>
            <input
              id="expense-amount"
              name="amount"
              inputMode="decimal"
              placeholder="Ej. 50000 o 50.000"
              defaultValue={amountValue}
              aria-invalid={Boolean(errors.amount)}
              className={fieldClass(Boolean(errors.amount))}
            />
            {errors.amount ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.amount}
              </p>
            ) : null}
          </div>

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : null}
              {isPending ? "Guardando…" : "Registrar gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}