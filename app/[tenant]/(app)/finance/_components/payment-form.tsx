"use client";

import { useEffect, useActionState, useRef } from "react";
import { X } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { createPaymentAction, type PaymentFormState } from "../actions";
import { PAYMENT_METHODS } from "@/lib/finance";
import type { CustomerOption } from "./finance-actions";

const IDLE_STATE: PaymentFormState = { status: "idle" };

/**
 * Modal de registro de cobro. Estado manejado por el Server Action vía
 * `useActionState`; al confirmar cierra y la lista se refresca por
 * `revalidatePath`.
 */
export default function PaymentForm({
  tenantSlug,
  customers,
  onClose,
}: {
  tenantSlug: string;
  customers: CustomerOption[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createPaymentAction,
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
  const customerIdValue = state.values?.customerId ?? "";
  const providerValue = state.values?.provider ?? PAYMENT_METHODS[0].value;
  const statusValue = state.values?.status ?? "APPROVED";
  const amountValue = state.values?.amount ?? "";
  const refValue = state.values?.providerRefId ?? "";
  const descriptionValue = state.values?.description ?? "";

  const fieldClass = (hasError: boolean) =>
    [
      "mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
      hasError
        ? "border-destructive focus:border-destructive focus:outline-destructive/30"
        : "border-border hover:border-ring/50 focus:border-ring focus:outline-ring/30",
    ].join(" ");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-ink/45 backdrop-blur-[1px]"
        onClick={() => !isPending && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-form-title"
        className="relative mt-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-popover sm:mt-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="payment-form-title"
              className="text-lg font-semibold text-foreground"
            >
              Registrar pago
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Registra un cobro recibido por el negocio.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={isPending}
            onClick={onClose}
            className="-m-1 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4" noValidate>
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="status" value={statusValue} />

          <div>
            <label
              htmlFor="payment-amount"
              className="text-sm font-medium text-foreground/80"
            >
              Monto (COP) <span className="text-destructive">*</span>
            </label>
            <input
              id="payment-amount"
              name="amount"
              inputMode="decimal"
              placeholder="Ej. 150000 o 150.000"
              defaultValue={amountValue}
              autoFocus
              aria-invalid={Boolean(errors.amount)}
              className={fieldClass(Boolean(errors.amount))}
            />
            {errors.amount ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.amount}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="payment-customer"
              className="text-sm font-medium text-foreground/80"
            >
              Cliente
            </label>
            <select
              id="payment-customer"
              name="customerId"
              defaultValue={customerIdValue}
              aria-describedby="payment-customer-hint"
              className={fieldClass(false)}
            >
              <option value="">Sin cliente vinculado</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.email ? ` · ${customer.email}` : ""}
                </option>
              ))}
            </select>
            <p
              id="payment-customer-hint"
              className="mt-1 text-xs text-muted-foreground"
            >
              Opcional: asocia el pago a un cliente activo.
            </p>
          </div>

          <div>
            <label
              htmlFor="payment-provider"
              className="text-sm font-medium text-foreground/80"
            >
              Método de pago <span className="text-destructive">*</span>
            </label>
            <select
              id="payment-provider"
              name="provider"
              defaultValue={providerValue}
              aria-invalid={Boolean(errors.provider)}
              className={fieldClass(Boolean(errors.provider))}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
            {errors.provider ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.provider}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="payment-ref"
              className="text-sm font-medium text-foreground/80"
            >
              Referencia del proveedor
            </label>
            <input
              id="payment-ref"
              name="providerRefId"
              defaultValue={refValue}
              aria-invalid={Boolean(errors.providerRefId)}
              placeholder="Ej. nequi-2026-0001"
              className={fieldClass(Boolean(errors.providerRefId))}
            />
            {errors.providerRefId ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.providerRefId}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="payment-description"
              className="text-sm font-medium text-foreground/80"
            >
              Descripción
            </label>
            <textarea
              id="payment-description"
              name="description"
              rows={2}
              defaultValue={descriptionValue}
              aria-invalid={Boolean(errors.description)}
              placeholder="Ej. Pago de consulta."
              className={[
                fieldClass(Boolean(errors.description)),
                "min-h-16 resize-y py-2",
              ].join(" ")}
            />
            {errors.description ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.description}
              </p>
            ) : null}
          </div>

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <NLoader size={16} className="text-current" />
              ) : null}
              {isPending ? "Guardando…" : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}