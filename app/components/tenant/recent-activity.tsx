import type { LucideIcon } from "lucide-react";
import { FileText, HandCoins, Receipt, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  ActivityType,
  RecentActivityItem,
} from "@/lib/dashboard-mocks";

type RecentActivityProps = {
  items: RecentActivityItem[];
};

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  customer: UserPlus,
  payment: HandCoins,
  expense: Receipt,
  invoice: FileText,
};

const ACTIVITY_TONES: Record<ActivityType, string> = {
  customer: "bg-indigo-50 text-indigo-600",
  payment: "bg-emerald-50 text-emerald-600",
  expense: "bg-rose-50 text-rose-600",
  invoice: "bg-slate-100 text-slate-600",
};

/**
 * Listado "Actividad reciente" del dashboard.
 * Los ítems llegan desde la página (por ahora mock; después, datos reales).
 */
export default function RecentActivity({ items }: RecentActivityProps) {
  return (
    <section
      aria-labelledby="recent-activity-title"
      className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2
          id="recent-activity-title"
          className="text-base font-semibold text-slate-900"
        >
          Actividad reciente
        </h2>
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          Datos de ejemplo
        </span>
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          Todavía no hay actividad en este negocio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const Icon = ACTIVITY_ICONS[item.type];

            return (
              <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                    ACTIVITY_TONES[item.type],
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {item.description}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {item.time}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
