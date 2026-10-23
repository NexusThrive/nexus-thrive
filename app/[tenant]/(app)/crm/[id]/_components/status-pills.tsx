import { Badge, StatusDot } from "@/components/atoms/badge";
import {
  paymentStatusLabel,
  type PaymentStatusValue,
} from "@/lib/finance";
import {
  MEMBERSHIP_STATUSES,
  type MembershipStatusValue,
} from "@/lib/business/memberships";
import type { CustomerAccountStatus } from "@/lib/tenant/db";

type DotTone = "success" | "danger" | "warning" | "muted";

/** Tonos por estado de pago (PENDING / APPROVED / DECLINED / VOIDED). */
const PAYMENT_TONES: Record<PaymentStatusValue, DotTone> = {
  APPROVED: "success",
  PENDING: "warning",
  DECLINED: "danger",
  VOIDED: "muted",
};

export function PaymentStatusPill({ status }: { status: PaymentStatusValue }) {
  return (
    <Badge variant="default">
      <StatusDot tone={PAYMENT_TONES[status]} />
      {paymentStatusLabel(status)}
    </Badge>
  );
}

/** Tonos del estado DINÁMICO de membresía (mismo criterio del módulo). */
const MEMBERSHIP_TONES: Record<MembershipStatusValue, DotTone> = {
  active: "success",
  expiring: "warning",
  expired: "danger",
};

export function MembershipStatusPill({
  status,
  prefix,
}: {
  status: MembershipStatusValue;
  /** Texto previo al estado (p. ej. el tipo: "Mensual Activa"). */
  prefix?: string;
}) {
  const label =
    MEMBERSHIP_STATUSES.find((option) => option.value === status)?.label ??
    status;
  return (
    <Badge variant="default">
      <StatusDot tone={MEMBERSHIP_TONES[status]} />
      {prefix ? `${prefix} ${label}` : label}
    </Badge>
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

const ACCOUNT_STATUS_TONES: Record<CustomerAccountStatus, DotTone> = {
  al_dia: "success",
  pendiente: "warning",
  vencido: "danger",
  sin_actividad: "muted",
  sin_datos: "muted",
};

export function AccountStatusPill({
  status,
}: {
  status: CustomerAccountStatus;
}) {
  return (
    <Badge variant="default">
      <StatusDot tone={ACCOUNT_STATUS_TONES[status]} />
      {ACCOUNT_STATUS_LABELS[status]}
    </Badge>
  );
}
