import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { getVerticalIcon } from "@/lib/admin/vertical-icons";
import type { PriorityItem } from "@/lib/ops/accounts";
import { cn } from "@/lib/utils";

export type PriorityGroup = {
  key: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  tone: "danger" | "warning" | "neutral";
  items: PriorityItem[];
  /** Ruta para ver todos (opcional). */
  href?: string;
};

const TONE: Record<PriorityGroup["tone"], string> = {
  danger: "bg-danger",
  warning: "bg-gold-600",
  neutral: "bg-foreground",
};

const rel = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });
function since(iso: string): string {
  const days = Math.round((Date.parse(iso) - Date.now()) / 86_400_000);
  if (days === 0) return "hoy";
  return rel.format(days, "day");
}

/**
 * "Prioridades de hoy": lo que el equipo debe atender al entrar, antes de
 * cualquier gráfico. Cada grupo muestra hasta 5 negocios con su motivo y
 * lleva a la ficha; vacío, confirma que no hay nada pendiente.
 */
export function PriorityBoard({ groups }: { groups: PriorityGroup[] }) {
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <section aria-labelledby="prioridades" className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="prioridades" className="font-display text-[17px] font-semibold">
          Prioridades de hoy
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{total} pendientes</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.key} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <g.icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
              <div className="min-w-0 flex-1">
                <h3 className="font-sans text-[13.5px] font-semibold">{g.title}</h3>
                <p className="truncate text-xs text-muted-foreground">{g.hint}</p>
              </div>
              <span
                className={cn(
                  "grid h-6 min-w-6 place-items-center rounded-sm px-1.5 font-mono text-xs font-semibold",
                  g.items.length ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground",
                )}
              >
                {g.items.length}
              </span>
            </div>
            {g.items.length ? (
              <ul className="divide-y divide-border">
                {g.items.slice(0, 5).map((it) => {
                  const { icon: Icon } = getVerticalIcon(it.vertical);
                  return (
                    <li key={it.id}>
                      <Link href={`/admin/negocios/${it.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted">
                        <i aria-hidden="true" className={cn("block size-1.5 shrink-0", TONE[g.tone])} />
                        <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[13.5px] font-medium">{it.name}</b>
                          <small className="block truncate text-xs text-muted-foreground">{it.detail}</small>
                        </span>
                        <small className="shrink-0 text-xs text-muted-foreground">{since(it.at)}</small>
                      </Link>
                    </li>
                  );
                })}
                {g.items.length > 5 && g.href ? (
                  <li>
                    <Link href={g.href} className="block px-4 py-2 text-xs font-semibold text-accent-text">
                      Ver los {g.items.length} →
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="flex items-center gap-2 px-4 py-4 text-[13px] text-muted-foreground">
                <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
                Nada pendiente.
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
