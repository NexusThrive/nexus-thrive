"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleDot, Headphones, HeartPulse, Inbox, Receipt, Rocket, Target, UserX, Wrench } from "lucide-react";
import { getVerticalIcon } from "@/lib/experience/vertical-icons";
import type { PriorityItem } from "@/lib/platform/accounts/accounts";
import { cn } from "@/lib/utils";
import { opsTable } from "./ops-table";

/** Un grupo de pendientes (serializable: el icono se resuelve aquí por su `key`). */
export type PriorityGroup = {
  key: string;
  title: string;
  hint: string;
  tone: "danger" | "warning" | "neutral";
  items: PriorityItem[];
  /** Ruta para ver todos (opcional). */
  href?: string;
};

const ICONS: Record<string, LucideIcon> = {
  inbox: Inbox,
  tickets: Headphones,
  billing: Receipt,
  health: HeartPulse,
  leads: Target,
  setup: Wrench,
  suspended: AlertTriangle,
  unassigned: UserX,
  recent: Rocket,
};

const TONE_DOT: Record<PriorityGroup["tone"], string> = {
  danger: "bg-danger",
  warning: "bg-gold-600",
  neutral: "bg-muted-foreground",
};
const TONE_ORDER: Record<PriorityGroup["tone"], number> = { danger: 0, warning: 1, neutral: 2 };

/** Filas que caben sin que el Inicio se vuelva una lista interminable; el resto está a un clic en su módulo. */
const MAX_ROWS = 8;

const rel = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });
function since(iso: string): string {
  const days = Math.round((Date.parse(iso) - Date.now()) / 86_400_000);
  if (days === 0) return "hoy";
  return rel.format(days, "day");
}

type Row = { group: PriorityGroup; item: PriorityItem };

/**
 * «Prioridades de hoy» en una sola tabla con el estilo de Clientes: lo urgente (rojo) primero, después lo que conviene atender
 * (oro) y lo informativo. Arriba, un filtro por categoría con su conteo; abajo, lo que está al día en una línea. Muestra hasta 8
 * filas y enlaza al módulo para ver el resto, así el Inicio queda ordenado aunque haya mucho pendiente.
 */
export function PriorityBoard({ groups }: { groups: PriorityGroup[] }) {
  const router = useRouter();
  const pending = useMemo(() => groups.filter((g) => g.items.length > 0).sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]), [groups]);
  const clear = groups.filter((g) => g.items.length === 0);
  const total = pending.reduce((n, g) => n + g.items.length, 0);
  const [filter, setFilter] = useState<string>("all");
  const active = pending.find((g) => g.key === filter);
  const all: Row[] = (active ? [active] : pending).flatMap((group) => group.items.map((item) => ({ group, item })));
  const rows = all.slice(0, MAX_ROWS);
  const hrefOf = ({ item }: Row) => item.href ?? `/admin/negocios/${item.id}`;
  const iconOf = ({ group, item }: Row) => (item.vertical ? getVerticalIcon(item.vertical).icon : (ICONS[group.key] ?? CircleDot));
  const category = ({ group }: Row) => (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-foreground">
      <i aria-hidden="true" className={cn("block size-[7px] rounded-[1px]", TONE_DOT[group.tone])} />
      {group.title}
    </span>
  );

  return (
    <section aria-labelledby="prioridades" className="nx-rise overflow-hidden rounded-3xl border border-border bg-card">
      <header className="flex flex-wrap items-end justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p className="mb-1 font-mono text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Hoy</p>
          <h2 id="prioridades" className="font-display text-lg font-semibold tracking-[-0.02em]">
            Prioridades
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          <b className="font-semibold tabular-nums text-foreground">{total}</b> pendientes
        </span>
      </header>

      {pending.length === 0 ? (
        <p className="mx-5 mb-5 flex items-center gap-2 rounded-2xl bg-surface-muted px-4 py-4 text-ui text-muted-foreground">
          <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
          Todo al día: no hay nada pendiente.
        </p>
      ) : (
        <>
          {/* Filtro por categoría: botones con su conteo; se desplaza en horizontal si no caben. */}
          <div role="group" aria-label="Filtrar por categoría" className="flex gap-1.5 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ key: "all", title: "Todo", count: total, tone: null as PriorityGroup["tone"] | null }, ...pending.map((g) => ({ key: g.key, title: g.title, count: g.items.length, tone: g.tone }))].map((chip) => {
              const on = filter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(chip.key)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors duration-(--d2) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:h-11",
                    on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {chip.tone ? <i aria-hidden="true" className={cn("block size-[7px] rounded-[1px]", TONE_DOT[chip.tone])} /> : null}
                  {chip.title}
                  <span className="tabular-nums opacity-70">{chip.count}</span>
                </button>
              );
            })}
          </div>

          {/* Tabla (PC): toda la fila abre su ficha; el nombre es el enlace para teclado y lector de pantalla. */}
          <div className={cn(opsTable.wrap, "border-t border-border/50")}>
            <table className={opsTable.table}>
              <caption className="sr-only">Prioridades de hoy</caption>
              <thead className={opsTable.head}>
                <tr className={opsTable.headRow}>
                  <th scope="col" className={opsTable.th}>Cuenta</th>
                  <th scope="col" className={opsTable.th}>Motivo</th>
                  <th scope="col" className={opsTable.th}>Categoría</th>
                  <th scope="col" className={cn(opsTable.th, "text-right")}>Desde</th>
                </tr>
              </thead>
              <tbody className={opsTable.body}>
                {rows.map((row) => {
                  const Icon = iconOf(row);
                  return (
                    <tr key={`${row.group.key}:${row.item.id}`} className={opsTable.row} onClick={(event) => !(event.target as Element).closest("a") && router.push(hrefOf(row))}>
                      <td className={opsTable.td}>
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent-text">
                            <Icon aria-hidden="true" strokeWidth={1.7} className="size-4" />
                          </span>
                          <Link href={hrefOf(row)} className="truncate font-medium text-foreground outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                            {row.item.name}
                          </Link>
                        </span>
                      </td>
                      <td className={cn(opsTable.td, "max-w-[28ch] truncate text-muted-foreground")}>{row.item.detail}</td>
                      <td className={opsTable.td}>{category(row)}</td>
                      <td className={cn(opsTable.td, "whitespace-nowrap text-right tabular-nums text-muted-foreground")}>{since(row.item.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lista (celular), como la de Clientes. */}
          <ul className={opsTable.list}>
            {rows.map((row) => (
              <li key={`${row.group.key}:${row.item.id}`} className={opsTable.item}>
                <Link href={hrefOf(row)} className="grid gap-1.5 outline-none focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="flex items-center justify-between gap-3">
                    <b className="truncate text-sm font-medium text-foreground">{row.item.name}</b>
                    <small className="shrink-0 text-xs text-muted-foreground">{since(row.item.at)}</small>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{row.item.detail}</span>
                  <span>{category(row)}</span>
                </Link>
              </li>
            ))}
          </ul>

          {all.length > MAX_ROWS || active?.href ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-5 py-3 text-xs text-muted-foreground">
              <span>
                Mostrando {rows.length} de {all.length}
              </span>
              {active?.href ? (
                <Link href={active.href} className="inline-flex items-center gap-1 font-semibold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  Ver todo en {active.title.toLowerCase()} <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {pending.length > 0 && clear.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/50 px-5 py-3 text-xs text-muted-foreground">
          <CheckCircle2 aria-hidden="true" className="size-3.5 text-success" />
          Al día: {clear.map((g) => g.title).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
