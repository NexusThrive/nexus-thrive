"use client";

import { useEffect, useActionState, useMemo, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
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
} from "@/lib/memberships";

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
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700"
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-form-title"
        className="relative mt-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:mt-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="membership-form-title"
              className="text-lg font-semibold text-slate-900"
            >
              Nueva membresía
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Registra un plan de membresía para un cliente.
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
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="startDate" value={startDate} />
          <input type="hidden" name="endDate" value={endDateValue} />

          <div>
            <label
              htmlFor="membership-customer"
              className="text-sm font-medium text-slate-700"
            >
              Cliente <span className="text-rose-500">*</span>
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
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.customerId}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="membership-type"
                className="text-sm font-medium text-slate-700"
              >
                Plan <span className="text-rose-500">*</span>
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
                className="text-sm font-medium text-slate-700"
              >
                Inicio <span className="text-rose-500">*</span>
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
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.startDate}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="membership-price"
              className="text-sm font-medium text-slate-700"
            >
              Precio (COP) <span className="text-rose-500">*</span>
            </label>
            <input
              id="membership-price"
              name="price"
              inputMode="decimal"
              placeholder="Ej. 120000"
              defaultValue={state.values?.price ?? ""}
              aria-invalid={Boolean(errors.price)}
              className={fieldClass(Boolean(errors.price))}
            />
            {errors.price ? (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.price}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">
              Vigencia calculada: vence {endDatePreview || "—"} (fin de día).
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
            <input
              type="checkbox"
              name="registerInitialPayment"
              checked={registerInitialPayment}
              onChange={(event) => setRegisterInitialPayment(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">
                Registrar cobro inicial
              </span>
              <span className="block text-xs text-slate-500">
                Crea un pago aprobado por el precio del plan.
              </span>
            </span>
          </label>

          {registerInitialPayment ? (
            <div>
              <label
                htmlFor="membership-provider"
                className="text-sm font-medium text-slate-700"
              >
                Método de pago <span className="text-rose-500">*</span>
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
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.provider}
                </p>
              ) : null}
            </div>
          ) : null}

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {state.message}
            </p>
          ) : null}

          {state.status === "ok" ? (
            <p
              role="status"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
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
              {isPending ? "Guardando…" : "Crear membresía"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
