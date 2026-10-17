"use client";

import { useEffect, useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import {
  renewMembershipAction,
  type RenewalFormState,
} from "../actions";
import { PAYMENT_METHODS } from "@/lib/finance";
import { typeLabel } from "@/lib/memberships";
import { formatDateShort, formatCurrency } from "@/lib/format";
import type { MembershipViewRow } from "./membership-table";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { labelClasses } from "@/components/atoms/input";

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

  const errors = state.errors ?? {};

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => { if (!open && !isPending) onClose(); }}
      title="Renovar membresía"
      description={<>{membership.customerName} · {typeLabel(membership.type)}</>}
    >
        <div className="rounded-lg border border-border bg-muted p-3 text-sm">
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
              className={labelClasses}
            >
              Método de pago
            </label>
            <select
              id="renewal-provider"
              name="provider"
              defaultValue="CASH"
              aria-invalid={Boolean(errors.provider)}
              className={[
                "h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition focus:outline-2",
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
              className="rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
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
              ) : (
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
              )}
              {isPending ? "Renovando…" : "Renovar"}
            </button>
          </div>
        </form>
      
    </ResponsiveSheet>
  );
}
