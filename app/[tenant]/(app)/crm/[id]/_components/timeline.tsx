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
  payment: "bg-emerald-50 text-emerald-600",
  membership: "bg-indigo-50 text-indigo-600",
  note: "bg-slate-100 text-slate-500",
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
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
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
                className="absolute left-[19px] top-9 h-full w-px bg-slate-200"
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 ring-white",
                EVENT_TONE[event.type],
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-medium text-slate-900">{event.title}</p>
                {event.status ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {event.status}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {formatDateTime(event.date)}
              </p>
              {event.description ? (
                <p className="mt-1 text-sm text-slate-600">{event.description}</p>
              ) : null}
              {typeof event.amount === "number" ? (
                <p className="mt-1 text-sm font-semibold text-slate-900">
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