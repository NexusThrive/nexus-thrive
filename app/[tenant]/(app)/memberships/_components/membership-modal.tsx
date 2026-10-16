"use client";

import { useEffect, useActionState } from "react";
import { RefreshCw, X } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import {
  renewMembershipAction,
  type RenewalFormState,
} from "../actions";
import { PAYMENT_METHODS } from "@/lib/finance";
import { typeLabel } from "@/lib/memberships";
import { formatDateShort, formatCurrency } from "@/lib/format";
import type { MembershipViewRow } from "./membership-table";

const IDLE_STATE: RenewalFormState = { status: "idle" };

/**
 * Modal de renovación. Extiende la vigencia un período completo del plan
 * (desde hoy si está vencida, desde su fin actual si sigue vigente) y,
 * opcionalmente, registra el cobro. Muestra la nueva fecha y cierra
 * automáticamente tras el feedback de éxito.
 */
export default function MembershipModal({
  tenantSlug,
  membership,
  onClose,
}: {
  tenantSlug: string;
  membership: MembershipViewRow;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    renewMembershipAction,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.status !== "ok") {
      return;
    }
    const timer = setTimeout(() => onClose(), 1800);
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-ink/45 backdrop-blur-[1px]"
        onClick={() => !isPending && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="renewal-modal-title"
        className="relative mt-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-popover sm:mt-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="renewal-modal-title"
              className="text-lg font-semibold text-foreground"
            >
              Renovar membresía
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {membership.customerName} · {typeLabel(membership.type)}
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

        <div className="mt-4 rounded-lg border border-border bg-muted p-3 text-sm">
          <div className="flex items-center justify-between gap-2 text-muted-foreground">
            <span>Precio del plan</span>
            <span className="font-medium text-foreground">
              {formatCurrency(membership.price)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-muted-foreground">
            <span>Vence hoy</span>
            <span className="font-medium text-foreground">
              {formatDateShort(membership.endDate)}
            </span>
          </div>
          <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
            {membership.status === "expired"
              ? "Está vencida: la nueva vigencia comienza hoy."
              : "La nueva vigencia se suma al fin del período actual."}
          </p>
        </div>

        <form action={formAction} className="mt-5 space-y-4" noValidate>
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="membershipId" value={membership.id} />

          <label className="flex items-start gap-3 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              name="registerPayment"
              defaultChecked
              className="mt-0.5 h-4 w-4 rounded-md border-border accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground/90">
                Registrar cobro de la renovación
              </span>
              <span className="block text-xs text-muted-foreground">
                Crea un pago aprobado por {formatCurrency(membership.price)}.
              </span>
            </span>
          </label>

          <div>
            <label
              htmlFor="renewal-provider"
              className="text-sm font-medium text-foreground/80"
            >
              Método de pago
            </label>
            <select
              id="renewal-provider"
              name="provider"
              defaultValue="CASH"
              aria-invalid={Boolean(errors.provider)}
              className={[
                "mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition focus:outline-2",
                errors.provider
                  ? "border-destructive focus:border-destructive focus:outline-destructive/30"
                  : "border-border hover:border-ring/50 focus:border-ring focus:outline-ring/30",
              ].join(" ")}
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

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.message}
            </p>
          ) : null}

          {state.status === "ok" ? (
            <p
              role="status"
              className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success"
            >
              {state.message ?? "Renovación registrada."}
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
              ) : (
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
              )}
              {isPending ? "Renovando…" : "Renovar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
