import { cn } from "@/lib/cn";
import {
  MEMBERSHIP_STATUSES,
  type MembershipStatusValue,
} from "@/lib/memberships";

const TONES: Record<MembershipStatusValue, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  expiring: "bg-amber-50 text-amber-700 ring-amber-600/20",
  expired: "bg-rose-50 text-rose-700 ring-rose-600/20",
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
