import { cn } from "@/lib/cn";
import {
  paymentStatusLabel,
  type PaymentStatusValue,
} from "@/lib/finance";
import {
  MEMBERSHIP_STATUSES,
  type MembershipStatusValue,
} from "@/lib/memberships";
import type { CustomerAccountStatus } from "@/lib/tenant-db";

/** Tonos por estado de pago (PENDING / APPROVED / DECLINED / VOIDED). */
const PAYMENT_TONES: Record<PaymentStatusValue, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  DECLINED: "bg-rose-50 text-rose-700 ring-rose-600/20",
  VOIDED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function PaymentStatusPill({ status }: { status: PaymentStatusValue }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        PAYMENT_TONES[status],
      )}
    >
      {paymentStatusLabel(status)}
    </span>
  );
}

/** Tonos del estado DINÁMICO de membresía (mismo criterio del módulo). */
const MEMBERSHIP_TONES: Record<MembershipStatusValue, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  expiring: "bg-amber-50 text-amber-700 ring-amber-600/20",
  expired: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function MembershipStatusPill({
  status,
}: {
  status: MembershipStatusValue;
}) {
  const label =
    MEMBERSHIP_STATUSES.find((option) => option.value === status)?.label ??
    status;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        MEMBERSHIP_TONES[status],
      )}
    >
      {label}
    </span>
  );
}

/** Estado general de cuenta de la ficha 360°. */
export const ACCOUNT_STATUS_LABELS: Record<CustomerAccountStatus, string> = {
  al_dia: "Al día",
  pendiente: "Pendiente",
  vencido: "Vencido",
  sin_actividad: "Sin actividad",
  sin_datos: "Sin datos",
};

const ACCOUNT_STATUS_TONES: Record<CustomerAccountStatus, string> = {
  al_dia: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pendiente: "bg-amber-50 text-amber-700 ring-amber-600/20",
  vencido: "bg-rose-50 text-rose-700 ring-rose-600/20",
  sin_actividad: "bg-slate-100 text-slate-600 ring-slate-500/20",
  sin_datos: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function AccountStatusPill({
  status,
}: {
  status: CustomerAccountStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        ACCOUNT_STATUS_TONES[status],
      )}
    >
      {ACCOUNT_STATUS_LABELS[status]}
    </span>
  );
}