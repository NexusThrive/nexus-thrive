"use client";

import { useEffect, useActionState } from "react";

import { NLoader } from "@/components/atoms/n-loader";
import { createExpenseAction, type ExpenseFormState } from "../actions";
import { EXPENSE_CATEGORIES } from "@/lib/finance";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";

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

  useEffect(() => {
    if (state.status === "ok") {
      onClose();
    }
  }, [state, onClose]);

  const errors = state.errors ?? {};
  const categoryValue = state.values?.category ?? EXPENSE_CATEGORIES[0];
  const descriptionValue = state.values?.description ?? "";
  const amountValue = state.values?.amount ?? "";

  const fieldClass = (hasError: boolean) =>
    [
      "mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
      hasError
        ? "border-destructive focus:border-destructive focus:outline-destructive/30"
        : "border-border hover:border-ring/50 focus:border-ring focus:outline-ring/30",
    ].join(" ");

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => { if (!open && !isPending) onClose(); }}
      title="Registrar gasto"
      description="Anota una salida de caja menor del negocio."
    >
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="tenantSlug" value={tenantSlug} />

          <div>
            <label
              htmlFor="expense-description"
              className="text-sm font-medium text-foreground/80"
            >
              Concepto <span className="text-destructive">*</span>
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
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.description}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="expense-category"
              className="text-sm font-medium text-foreground/80"
            >
              Categoría <span className="text-destructive">*</span>
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
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.category}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="expense-amount"
              className="text-sm font-medium text-foreground/80"
            >
              Monto (COP) <span className="text-destructive">*</span>
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
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.amount}
              </p>
            ) : null}
          </div>

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={buttonVariants()}
            >
              {isPending ? (
                <NLoader size={16} className="text-current" />
              ) : null}
              {isPending ? "Guardando…" : "Registrar gasto"}
            </button>
          </div>
        </form>
      
    </ResponsiveSheet>
  );
}