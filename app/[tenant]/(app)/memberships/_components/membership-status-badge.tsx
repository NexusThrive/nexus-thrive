import { cn } from "@/lib/cn";
import {
  MEMBERSHIP_STATUSES,
  type MembershipStatusValue,
} from "@/lib/memberships";

const TONES: Record<MembershipStatusValue, string> = {
  active: "bg-success/10 text-success ring-success/20",
  expiring: "bg-warning text-warning-foreground ring-gold-600/20",
  expired: "bg-destructive/10 text-destructive ring-destructive/20",
};

/**
 * Badge del estado DINÁMICO de la membresía (calculado en el servidor
 * desde `endDate`, nunca desde el valor persistido).
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
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[status],
      )}
    >
      {label}
    </span>
  );
}
