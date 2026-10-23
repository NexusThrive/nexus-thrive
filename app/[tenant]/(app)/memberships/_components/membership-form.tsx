"use client";

import { MoneyInput } from "@/components/molecules/money-input";
import { parseMoney } from "@/lib/business/money";
import { useEffect, useActionState, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import {
  createMembershipAction,
  type MembershipFormState,
} from "../actions";
import { PAYMENT_METHODS } from "@/lib/finance";
import {
  MEMBERSHIP_TYPES,
  addMonths,
  bogotaToday,
  parsePlainDate,
  plainToInputDate,
  typeMonths,
  type MembershipTypeValue,
} from "@/lib/business/memberships";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { labelClasses } from "@/components/atoms/input";

export type MembershipCustomerOption = {
  id: string;
  name: string;
  email: string;
};

const IDLE_STATE: MembershipFormState = { status: "idle" };

/**
 * Botón "Nueva membresía" del encabezado: abre el modal de alta.
 */
export function NewMembershipButton({
  tenantSlug,
  customers,
}: {
  tenantSlug: string;
  customers: MembershipCustomerOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonVariants()}
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Nueva membresía
      </button>
      {open ? (
        <MembershipForm
          tenantSlug={tenantSlug}
          customers={customers}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * Modal de alta de membresía. La vigencia fin (`endDate`) se calcula en
 * el cliente solo como previsualización (startDate + duración del plan);
 * el servidor la recalcula siempre con la misma regla.
 */
function MembershipForm({
  tenantSlug,
  customers,
  onClose,
}: {
  tenantSlug: string;
  customers: MembershipCustomerOption[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createMembershipAction,
    IDLE_STATE,
  );

  const [type, setType] = useState<MembershipTypeValue>("mensual");
  const [startDate, setStartDate] = useState(() =>
    plainToInputDate(bogotaToday()),
  );
  const [registerInitialPayment, setRegisterInitialPayment] = useState(true);

  // Previsualización de la vigencia fin (misma regla que el servidor).
  const endDateValue = useMemo(() => {
    const plain = parsePlainDate(startDate);
    if (!plain) {
      return "";
    }
    return plainToInputDate(addMonths(plain, typeMonths(type)));
  }, [startDate, type]);

  const endDatePreview = useMemo(() => {
    const plain = parsePlainDate(endDateValue);
    if (!plain) {
      return "";
    }
    return `${String(plain.day).padStart(2, "0")}/${String(plain.month).padStart(2, "0")}/${plain.year}`;
  }, [endDateValue]);

  useEffect(() => {
    if (state.status !== "ok") {
      return;
    }
    const timer = setTimeout(() => onClose(), 1400);
    return () => clearTimeout(timer);
  }, [state, onClose]);

  const errors = state.errors ?? {};

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
      title="Nueva membresía"
      description="Registra un plan de membresía para un cliente."
    >
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="startDate" value={startDate} />
          <input type="hidden" name="endDate" value={endDateValue} />

          <div>
            <label
              htmlFor="membership-customer"
              className={labelClasses}
            >
              Cliente <span className="text-destructive">*</span>
            </label>
            <select
              id="membership-customer"
              name="customerId"
              defaultValue=""
              autoFocus
              aria-invalid={Boolean(errors.customerId)}
              className={fieldClass(Boolean(errors.customerId))}
            >
              <option value="" disabled>
                Selecciona un cliente…
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.email ? ` · ${customer.email}` : ""}
                </option>
              ))}
            </select>
            {errors.customerId ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.customerId}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="membership-type"
                className={labelClasses}
              >
                Plan <span className="text-destructive">*</span>
              </label>
              <select
                id="membership-type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as MembershipTypeValue)
                }
                className={fieldClass(false)}
              >
                {MEMBERSHIP_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="membership-start"
                className={labelClasses}
              >
                Inicio <span className="text-destructive">*</span>
              </label>
              <input
                id="membership-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                aria-invalid={Boolean(errors.startDate)}
                className={fieldClass(Boolean(errors.startDate))}
              />
              {errors.startDate ? (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors.startDate}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="membership-price"
              className={labelClasses}
            >
              Precio (COP) <span className="text-destructive">*</span>
            </label>
            <MoneyInput
              id="membership-price"
              name="price"
              placeholder="120.000"
              defaultValue={parseMoney(state.values?.price ?? "")}
              aria-invalid={Boolean(errors.price)}
              className={fieldClass(Boolean(errors.price))}
            />
            {errors.price ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.price}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Vigencia calculada: vence {endDatePreview || "—"} (fin de día).
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              name="registerInitialPayment"
              checked={registerInitialPayment}
              onChange={(event) => setRegisterInitialPayment(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded-md border-border accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground/90">
                Registrar cobro inicial
              </span>
              <span className="block text-xs text-muted-foreground">
                Crea un pago aprobado por el precio del plan.
              </span>
            </span>
          </label>

          {registerInitialPayment ? (
            <div>
              <label
                htmlFor="membership-provider"
                className={labelClasses}
              >
                Método de pago <span className="text-destructive">*</span>
              </label>
              <select
                id="membership-provider"
                name="provider"
                defaultValue={state.values?.provider ?? "CASH"}
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
          ) : null}

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
            >
              {state.message}
            </p>
          ) : null}

          {state.status === "ok" ? (
            <p
              role="status"
              className="inline-flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success"
            >
              <Check aria-hidden="true" className="h-4 w-4" />
              Membresía creada.
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
              {isPending ? "Guardando…" : "Crear membresía"}
            </button>
          </div>
        </form>
      
    </ResponsiveSheet>
  );
}
