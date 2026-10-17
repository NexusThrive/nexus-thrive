"use client";

import { useEffect, useActionState } from "react";

import { NLoader } from "@/components/atoms/n-loader";
import { createPaymentAction, type PaymentFormState } from "../actions";
import { PAYMENT_METHODS } from "@/lib/finance";
import type { CustomerOption } from "./finance-actions";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { labelClasses } from "@/components/atoms/input";

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

  useEffect(() => {
    if (state.status === "ok") {
      onClose();
    }
  }, [state, onClose]);

  const errors = state.errors ?? {};
  const customerIdValue = state.values?.customerId ?? "";
  const providerValue = state.values?.provider ?? PAYMENT_METHODS[0].value;
  const statusValue = state.values?.status ?? "APPROVED";
  const amountValue = state.values?.amount ?? "";
  const refValue = state.values?.providerRefId ?? "";
  const descriptionValue = state.values?.description ?? "";

  const fieldClass = (hasError: boolean) =>
    [
      "h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
      hasError
        ? "border-destructive focus:border-destructive focus:outline-destructive/30"
        : "border-border hover:border-ring/50 focus:border-ring focus:outline-ring/30",
    ].join(" ");

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => { if (!open && !isPending) onClose(); }}
      title="Registrar pago"
      description="Registra un cobro recibido por el negocio."
    >
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="status" value={statusValue} />

          <div>
            <label
              htmlFor="payment-amount"
              className={labelClasses}
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
              className={labelClasses}
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
              className={labelClasses}
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
              className={labelClasses}
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
              className={labelClasses}
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
              {isPending ? "Guardando…" : "Registrar pago"}
            </button>
          </div>
        </form>
      
    </ResponsiveSheet>
  );
}