import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type KpiTone = "indigo" | "emerald" | "amber" | "rose" | "slate";

const TONES: Record<KpiTone, string> = {
  indigo: "bg-accent-subtle text-accent-text",
  emerald: "bg-success/10 text-success",
  amber: "bg-warning text-warning-foreground",
  rose: "bg-destructive/10 text-destructive",
  slate: "bg-muted text-muted-foreground",
};

/**
 * KPI de la Ficha 360°. Componente de presentación puro (Server Component):
 * recibe valores ya formateados/serializables.
 */
export default function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "slate",
}: {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  tone?: KpiTone;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
        <span
          aria-hidden="true"
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
            TONES[tone],
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-2 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {value}
      </p>
      {description ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{description}</p>
      ) : null}
    </article>
  );
}
