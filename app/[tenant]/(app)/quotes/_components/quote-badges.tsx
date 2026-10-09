import { Badge, StatusDot } from "@/components/ui/badge";
import {
  apuCategoryLabel,
  quoteStatusLabel,
  type ApuItemCategoryValue,
  type QuoteStatusValue,
} from "@/lib/apu-engine";

const STATUS_DOTS: Record<
  QuoteStatusValue,
  "success" | "danger" | "warning" | "muted"
> = {
  DRAFT: "muted",
  SENT: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const CATEGORY_VARIANTS: Record<
  ApuItemCategoryValue,
  "gold" | "secondary" | "outline"
> = {
  MATERIAL: "gold",
  MANO_DE_OBRA: "gold",
  EQUIPO: "secondary",
  TRANSPORTE: "outline",
};

/** Badge de estado de presupuesto: punto cuadrado + texto en tinta. */
export function QuoteStatusBadge({
  status,
}: {
  status: QuoteStatusValue;
}) {
  return (
    <Badge>
      <StatusDot tone={STATUS_DOTS[status]} />
      {quoteStatusLabel(status)}
    </Badge>
  );
}

/** Badge de categoría de insumo. */
export function ApuCategoryBadge({
  category,
}: {
  category: ApuItemCategoryValue;
}) {
  return (
    <Badge variant={CATEGORY_VARIANTS[category]}>
      {apuCategoryLabel(category)}
    </Badge>
  );
}
