import { cn } from "@/lib/cn";
import {
  apuCategoryLabel,
  quoteStatusLabel,
  type ApuItemCategoryValue,
  type QuoteStatusValue,
} from "@/lib/apu-engine";

const STATUS_TONES: Record<QuoteStatusValue, string> = {
  DRAFT: "border-border bg-muted text-muted-foreground",
  SENT: "border-accent/30 bg-accent-subtle text-accent-text",
  APPROVED: "border-success/30 bg-success/10 text-success",
  REJECTED: "border-destructive/30 bg-destructive/10 text-destructive",
};

const CATEGORY_TONES: Record<ApuItemCategoryValue, string> = {
  MATERIAL: "border-accent/30 bg-accent-subtle text-accent-text",
  MANO_DE_OBRA: "border-gold-300 bg-gold-100 text-gold-700",
  EQUIPO: "border-graphite-200 bg-graphite-100 text-graphite-700",
  TRANSPORTE: "border-graphite-200 bg-graphite-100 text-graphite-500",
};

/** Badge de estado de presupuesto (presentación pura, server-safe). */
export function QuoteStatusBadge({
  status,
}: {
  status: QuoteStatusValue;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_TONES[status],
      )}
    >
      {quoteStatusLabel(status)}
    </span>
  );
}

/** Badge de categoría de insumo. */
export function ApuCategoryBadge({
  category,
}: {
  category: ApuItemCategoryValue;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        CATEGORY_TONES[category],
      )}
    >
      {apuCategoryLabel(category)}
    </span>
  );
}