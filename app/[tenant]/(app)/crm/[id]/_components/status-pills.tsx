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
  APPROVED: "bg-success/10 text-success ring-success/20",
  PENDING: "bg-warning text-warning-foreground ring-gold-600/20",
  DECLINED: "bg-destructive/10 text-destructive ring-destructive/20",
  VOIDED: "bg-muted text-muted-foreground ring-border",
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
  active: "bg-success/10 text-success ring-success/20",
  expiring: "bg-warning text-warning-foreground ring-gold-600/20",
  expired: "bg-destructive/10 text-destructive ring-destructive/20",
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
  al_dia: "bg-success/10 text-success ring-success/20",
  pendiente: "bg-warning text-warning-foreground ring-gold-600/20",
  vencido: "bg-destructive/10 text-destructive ring-destructive/20",
  sin_actividad: "bg-muted text-muted-foreground ring-border",
  sin_datos: "bg-muted text-muted-foreground ring-border",
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
