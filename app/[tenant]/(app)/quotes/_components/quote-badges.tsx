import { cn } from "@/lib/cn";
import {
  apuCategoryLabel,
  quoteStatusLabel,
  type ApuItemCategoryValue,
  type QuoteStatusValue,
} from "@/lib/apu-engine";

const STATUS_TONES: Record<QuoteStatusValue, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  SENT: "border-sky-200 bg-sky-50 text-sky-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
};

const CATEGORY_TONES: Record<ApuItemCategoryValue, string> = {
  MATERIAL: "border-indigo-200 bg-indigo-50 text-indigo-700",
  MANO_DE_OBRA: "border-amber-200 bg-amber-50 text-amber-700",
  EQUIPO: "border-violet-200 bg-violet-50 text-violet-700",
  TRANSPORTE: "border-cyan-200 bg-cyan-50 text-cyan-700",
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