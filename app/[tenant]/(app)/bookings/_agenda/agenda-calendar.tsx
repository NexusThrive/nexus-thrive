"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { addDaysKey, bogotaParts, monthGrid, occupancy, slotPosition, weekStart } from "@/lib/business/calendar";
import { useMinute } from "@/lib/use-minute";
import { cn } from "@/lib/utils";
import BookingDetail, { STATUS } from "./booking-detail";
import BookingSheet from "./booking-sheet";
import type { AgendaBooking, AgendaOption, AgendaService } from "./types";

type View = "month" | "week" | "day";
const FIRST_HOUR = 6;
const LAST_HOUR = 22;
const HOUR_PX = 48;
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const OCC = ["", "bg-surface-muted", "bg-accent-subtle/70", "bg-danger-subtle/70"] as const;
const OCC_LABEL = ["Libre", "Con citas", "Casi lleno", "Lleno"] as const;

const hhmm = (ms: number) => {
  const p = bogotaParts(ms);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
};
const label = (day: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { ...opts, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

/**
 * Agenda tipo calendario: Mes (cada día teñido según qué tan lleno está),
 * Semana y Día con franjas horarias. Tocar un día o una hora abre el
 * formulario con esa fecha; tocar una cita abre su ficha.
 */
export default function AgendaCalendar({
  slug,
  business,
  view,
  cursor,
  today,
  bookings,
  customers,
  services,
  staff,
  dailyCapacity,
}: {
  slug: string;
  business: string;
  view: View;
  cursor: string;
  today: string;
  bookings: AgendaBooking[];
  customers: AgendaOption[];
  services: AgendaService[];
  staff: AgendaOption[];
  dailyCapacity: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const now = useMinute();
  const [create, setCreate] = useState<{ day: string; time: string } | null>(params.get("nuevo") === "1" ? { day: cursor, time: "09:00" } : null);
  const [open, setOpen] = useState<AgendaBooking | null>(null);
  const [editing, setEditing] = useState<AgendaBooking | null>(null);
  const [selected, setSelected] = useState(cursor);
  const live = bookings.filter((b) => b.status !== "CANCELLED");
  const byDay = new Map<string, AgendaBooking[]>();
  for (const b of bookings) {
    const d = bogotaParts(b.start).day;
    byDay.set(d, [...(byDay.get(d) ?? []), b].sort((a, x) => a.start - x.start));
  }
  const liveCount = (d: string) => (byDay.get(d) ?? []).filter((b) => b.status !== "CANCELLED").length;

  const go = (v: View, d: string) => {
    const p = new URLSearchParams(params.toString());
    p.set("v", v);
    p.set("d", d);
    p.delete("nuevo");
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const step = (dir: 1 | -1) => {
    if (view === "month") {
      const [y, m] = cursor.split("-").map(Number);
      const next = new Date(Date.UTC(y, m - 1 + dir, 1));
      go(view, next.toISOString().slice(0, 10));
    } else go(view, addDaysKey(cursor, dir * (view === "week" ? 7 : 1)));
  };
  const nextHour = () => {
    const p = bogotaParts(now);
    return `${String(Math.min(LAST_HOUR - 1, Math.max(FIRST_HOUR, p.hour + 1))).padStart(2, "0")}:00`;
  };
  const openCreate = (day: string, time?: string) => setCreate({ day, time: time ?? (day === today ? nextHour() : "09:00") });

  const [y, m] = cursor.split("-").map(Number);
  const title =
    view === "month"
      ? label(`${cursor.slice(0, 7)}-01`, { month: "long", year: "numeric" })
      : view === "week"
        ? `Semana del ${label(weekStart(cursor), { day: "numeric", month: "short" })}`
        : label(cursor, { weekday: "long", day: "numeric", month: "long" });

  const days = view === "week" ? Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart(cursor), i)) : [cursor];
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
  const nowPos = bogotaParts(now);

  const Block = ({ b }: { b: AgendaBooking }) => {
    const pos = slotPosition(b.start, b.end, FIRST_HOUR);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(b);
        }}
        style={{ top: (pos.top / 60) * HOUR_PX, height: Math.max(22, (pos.height / 60) * HOUR_PX - 2) }}
        className={cn(
          "absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11.5px] leading-tight shadow-sm transition-transform hover:-translate-y-px",
          b.status === "CANCELLED" ? "border-border bg-surface-muted text-muted-foreground line-through" : b.status === "COMPLETED" ? "border-success bg-success-subtle" : "border-accent bg-accent-subtle",
        )}
      >
        <b className="block truncate font-semibold">{b.serviceName}</b>
        <span className="block truncate">
          {hhmm(b.start)} · {b.customerName}
        </span>
      </button>
    );
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Anterior" onClick={() => step(-1)} className={buttonVariants({ variant: "outline", size: "icon" })}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button type="button" aria-label="Siguiente" onClick={() => step(1)} className={buttonVariants({ variant: "outline", size: "icon" })}>
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={() => go(view, today)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Hoy
          </button>
        </div>
        <h2 className="order-first min-w-0 basis-full truncate font-display text-[18px] font-bold first-letter:uppercase sm:order-none sm:basis-auto sm:flex-1">{title}</h2>
        <SegmentedControl ariaLabel="Vista" value={view} onChange={(v) => go(v, cursor)} options={[{ value: "month", label: "Mes" }, { value: "week", label: "Semana" }, { value: "day", label: "Día" }]} />
        <button type="button" onClick={() => openCreate(view === "month" ? selected : cursor)} className={buttonVariants()}>
          <Plus aria-hidden="true" className="size-4" /> Agendar
        </button>
      </div>

      {view === "month" ? (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-7 border-b border-border bg-surface-muted text-center font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-2">
                  {d}
                </span>
              ))}
            </div>
            {monthGrid(y, m).map((week) => (
              <div key={week[0].day} className="grid grid-cols-7 border-b border-border last:border-0">
                {week.map(({ day, inMonth }) => {
                  const list = byDay.get(day) ?? [];
                  const lvl = occupancy(liveCount(day), dailyCapacity);
                  const isToday = day === today;
                  return (
                    <div
                      key={day}
                      role="button"
                      tabIndex={0}
                      aria-label={`${label(day, { weekday: "long", day: "numeric", month: "long" })}: ${OCC_LABEL[lvl]}, ${liveCount(day)} citas`}
                      onClick={() => {
                        setSelected(day);
                        if (window.matchMedia("(min-width: 768px)").matches) openCreate(day);
                      }}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openCreate(day))}
                      className={cn(
                        "group relative min-h-16 cursor-pointer border-r border-border p-1.5 text-left transition-colors last:border-r-0 hover:bg-surface-muted/60 md:min-h-28",
                        !inMonth && "opacity-40",
                        OCC[lvl],
                        selected === day && "ring-2 ring-inset ring-accent",
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            go("day", day);
                          }}
                          className={cn("grid size-6 place-items-center rounded-full font-mono text-[12px] tabular-nums hover:bg-border", isToday && "bg-ink font-bold text-[#F7F6F3]")}
                        >
                          {Number(day.slice(8))}
                        </button>
                        {liveCount(day) ? <span className="font-mono text-[10.5px] text-muted-foreground md:hidden">{liveCount(day)}</span> : null}
                        <Plus aria-hidden="true" className="hidden size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 md:block" />
                      </span>
                      <ul className="mt-1 hidden gap-0.5 md:grid">
                        {list.slice(0, 3).map((b) => (
                          <li key={b.id}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpen(b);
                              }}
                              className={cn("block w-full truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-surface", b.status === "CANCELLED" && "text-muted-foreground line-through")}
                            >
                              <span className="font-mono">{hhmm(b.start)}</span> {b.serviceName}
                            </button>
                          </li>
                        ))}
                        {list.length > 3 ? (
                          <li>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                go("day", day);
                              }}
                              className="px-1 text-[11px] font-medium text-accent-text"
                            >
                              +{list.length - 3} más
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {OCC_LABEL.map((l, i) => (
              <span key={l} className="flex items-center gap-1.5">
                <i aria-hidden="true" className={cn("size-3 rounded-sm border border-border", OCC[i])} /> {l}
              </span>
            ))}
          </div>
          {/* Celular: el día elegido con sus citas. */}
          <section className="grid gap-2 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold first-letter:uppercase">{label(selected, { weekday: "long", day: "numeric", month: "long" })}</h3>
              <button type="button" onClick={() => openCreate(selected)} className={buttonVariants({ size: "sm" })}>
                <Plus aria-hidden="true" className="size-3.5" /> Agendar este día
              </button>
            </div>
            <ul className="grid gap-2">
              {(byDay.get(selected) ?? []).map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => setOpen(b)} className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left">
                    <span className="font-mono text-[13px] tabular-nums">{hhmm(b.start)}</span>
                    <span className="min-w-0 flex-1">
                      <b className={cn("block truncate text-[13.5px] font-medium", b.status === "CANCELLED" && "line-through")}>{b.serviceName}</b>
                      <small className="block truncate text-xs text-muted-foreground">{b.customerName}</small>
                    </span>
                    <small className="text-[11px] text-muted-foreground">{STATUS[b.status].label}</small>
                  </button>
                </li>
              ))}
              {!(byDay.get(selected) ?? []).length ? <li className="py-4 text-center text-[13px] text-muted-foreground">Día libre.</li> : null}
            </ul>
          </section>
        </>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <div className={cn("grid", view === "week" ? "min-w-[760px] grid-cols-[52px_repeat(7,minmax(0,1fr))]" : "grid-cols-[52px_minmax(0,1fr)]")}>
            <span className="border-b border-border" />
            {days.map((d) => (
              <button key={d} type="button" onClick={() => go("day", d)} className={cn("border-b border-l border-border py-2 text-center text-[12px]", d === today && "bg-accent-subtle/60 font-semibold")}>
                <span className="block font-mono text-[10.5px] uppercase text-muted-foreground">{label(d, { weekday: "short" })}</span>
                <span className="font-display text-[16px] font-bold">{Number(d.slice(8))}</span>
                <span className="block text-[10.5px] text-muted-foreground">{liveCount(d) ? `${liveCount(d)} ${liveCount(d) === 1 ? "cita" : "citas"}` : "libre"}</span>
              </button>
            ))}
            <div className="relative" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h) => (
                <span key={h} className="absolute right-1.5 -translate-y-1/2 font-mono text-[10.5px] text-muted-foreground" style={{ top: (h - FIRST_HOUR) * HOUR_PX }}>
                  {h > FIRST_HOUR ? `${String(h).padStart(2, "0")}:00` : ""}
                </span>
              ))}
            </div>
            {days.map((d) => (
              <div
                key={d}
                role="button"
                tabIndex={0}
                aria-label={`Agendar el ${label(d, { weekday: "long", day: "numeric" })}`}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minutes = Math.floor(((e.clientY - rect.top) / HOUR_PX) * 2) * 30 + FIRST_HOUR * 60;
                  openCreate(d, `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
                }}
                onKeyDown={(e) => e.key === "Enter" && openCreate(d)}
                className="relative cursor-pointer border-l border-border"
                style={{ height: hours.length * HOUR_PX, backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border) 0 1px, transparent 1px ${HOUR_PX}px)` }}
              >
                {d === nowPos.day && nowPos.hour >= FIRST_HOUR && nowPos.hour < LAST_HOUR ? (
                  <i aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-danger" style={{ top: ((nowPos.hour - FIRST_HOUR) * 60 + nowPos.minute) * (HOUR_PX / 60) }} />
                ) : null}
                {(byDay.get(d) ?? []).map((b) => (
                  <Block key={b.id} b={b} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {live.length} {live.length === 1 ? "cita" : "citas"} en este periodo · toca un día o una hora para agendar.
      </p>

      {create ? <BookingSheet slug={slug} day={create.day} time={create.time} booking={null} customers={customers} services={services} staff={staff} onClose={() => setCreate(null)} /> : null}
      {editing ? <BookingSheet slug={slug} day={cursor} time="09:00" booking={editing} customers={customers} services={services} staff={staff} onClose={() => setEditing(null)} /> : null}
      {open ? <BookingDetail slug={slug} booking={open} business={business} onEdit={() => { setEditing(open); setOpen(null); }} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
