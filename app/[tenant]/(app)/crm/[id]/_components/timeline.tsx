import type { LucideIcon } from "lucide-react";
import { StickyNote, Wallet, BadgeCheck } from "lucide-react";
import type { CustomerTimelineEvent } from "@/lib/tenant-db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const EVENT_ICON: Record<CustomerTimelineEvent["type"], LucideIcon> = {
  payment: Wallet,
  membership: BadgeCheck,
  note: StickyNote,
};

const EVENT_TONE: Record<CustomerTimelineEvent["type"], string> = {
  payment: "bg-success/10 text-success",
  membership: "bg-accent-subtle text-accent-text",
  note: "bg-muted text-muted-foreground",
};

/**
 * Timeline unificado de la ficha 360° (Server Component): eventos de
 * pagos, membresías y notas ordenados por fecha descendente.
 */
export default function TimelinePanel({
  events,
  emptyText,
}: {
  events: CustomerTimelineEvent[];
  emptyText: string;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <ol className="relative space-y-1">
      {events.map((event, index) => {
        const Icon = EVENT_ICON[event.type];
        const isLast = index === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3 pb-5">
            {!isLast ? (
              <span
                aria-hidden="true"
                className="absolute left-[19px] top-9 h-full w-px bg-border"
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "z-10 grid h-10 w-10 shrink-0 place-items-center rounded-sm ring-4 ring-background",
                EVENT_TONE[event.type],
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-medium text-foreground">{event.title}</p>
                {event.status ? (
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {event.status}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatDateTime(event.date)}
              </p>
              {event.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
              ) : null}
              {typeof event.amount === "number" ? (
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatCurrency(event.amount)}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
