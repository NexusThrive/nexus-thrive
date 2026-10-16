import { Badge, StatusDot } from "@/components/atoms/badge";
import { projectStatusLabel, type ProjectStatusValue } from "@/lib/projects";

const STATUS_DOTS: Record<
  ProjectStatusValue,
  "success" | "danger" | "warning" | "muted"
> = {
  DRAFT: "muted",
  BIDDING: "warning",
  APPROVED: "success",
  IN_EXECUTION: "success",
  COMPLETED: "muted",
  CANCELLED: "danger",
};

/** Badge de estado de un proyecto de obra. */
export function ProjectStatusBadge({
  status,
}: {
  status: ProjectStatusValue;
}) {
  return (
    <Badge>
      <StatusDot tone={STATUS_DOTS[status]} />
      {projectStatusLabel(status)}
    </Badge>
  );
}