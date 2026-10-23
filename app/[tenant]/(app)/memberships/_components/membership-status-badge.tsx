import { Badge, StatusDot } from "@/components/atoms/badge";
import {
  MEMBERSHIP_STATUSES,
  type MembershipStatusValue,
} from "@/lib/business/memberships";

const TONES: Record<MembershipStatusValue, "success" | "muted" | "danger"> = {
  active: "success",
  expiring: "muted",
  expired: "danger",
};

/**
 * Badge del estado DINÁMICO de la membresía (calculado en el servidor
 * desde `endDate`, nunca desde el valor persistido). Punto cuadrado.
 */
export default function MembershipStatusBadge({
  status,
}: {
  status: MembershipStatusValue;
}) {
  const label =
    MEMBERSHIP_STATUSES.find((option) => option.value === status)?.label ??
    status;

  return (
    <Badge variant="default">
      <StatusDot tone={TONES[status]} />
      {label}
    </Badge>
  );
}
