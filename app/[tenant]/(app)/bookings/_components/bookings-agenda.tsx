"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { useToast } from "@/components/molecules/toast";
import { MonthCalendar } from "@/components/molecules/month-calendar";
import { WeekStrip } from "@/components/molecules/week-strip";
import { AgendaTimeline, type AgendaItem } from "@/components/organisms/agenda-timeline";
import { dayTitle } from "@/lib/calendar";
import { bogotaDayKey } from "@/lib/finance-series";
import { useMinute } from "@/lib/use-minute";
import { updateBookingStatusAction } from "../actions";
import type { BookingView } from "./bookings-view";

const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const clock = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/**
 * Agenda de reservas (como la del artefacto): semana deslizable, mes en
 * escritorio y la línea de tiempo del día con la raya de "ahora". Marcar
 * atendida guarda COMPLETED con la acción de siempre (optimista: la tarjeta
 * cambia al instante y vuelve atrás si el servidor la rechaza).
 */
export default function BookingsAgenda({
  tenantSlug,
  bookings,
  onNew,
}: {
  tenantSlug: string;
  bookings: BookingView[];
  onNew: () => void;
}) {
  const { toast } = useToast();
  const nowMs = useMinute();
  const today = bogotaDayKey(nowMs);
  const [picked, setDay] = useState<string | null>(null);
  const day = picked ?? today;
  const [done, setDone] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const byDay = useMemo(() => {
    const map = new Map<string, BookingView[]>();
    for (const b of bookings) {
      const key = bogotaDayKey(b.startAt);
      map.set(key, [...(map.get(key) ?? []), b]);
    }
    return map;
  }, [bookings]);

  const counts = useMemo(() => Object.fromEntries([...byDay].map(([k, v]) => [k, v.length])), [byDay]);
  const marked = useMemo(() => new Set(byDay.keys()), [byDay]);

  const items: AgendaItem[] = (byDay.get(day) ?? [])
    .map((b) => ({
      id: b.id,
      time: hhmm.format(new Date(b.startAt)),
      title: b.serviceName,
      subtitle: `${b.customerName} · ${clock.format(new Date(b.startAt))} – ${clock.format(new Date(b.endAt))} · ${b.amountLabel}`,
      initials: initials(b.customerName),
      done: b.status === "COMPLETED" || done.has(b.id),
      cancelled: b.status === "CANCELLED",
    }))
    .sort((a, b) => (a.time < b.time ? -1 : 1));

  const attended = items.filter((i) => i.done).length;

  const markDone = (item: AgendaItem) => {
    if (item.done) return;
    setDone((prev) => new Set(prev).add(item.id));
    setPendingId(item.id);
    startTransition(async () => {
      const form = new FormData();
      form.set("tenantSlug", tenantSlug);
      form.set("bookingId", item.id);
      form.set("status", "COMPLETED");
      const result = await updateBookingStatusAction({ status: "idle" }, form);
      setPendingId(null);
      if (result.status === "ok") {
        toast({ title: "Cita atendida", description: item.title, variant: "success" });
      } else {
        setDone((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        toast({ title: "No se pudo marcar", description: result.message ?? "Inténtalo de nuevo.", variant: "error" });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="grid content-start gap-3.5">
        <WeekStrip value={day} today={today} counts={counts} onChange={setDay} />
        <MonthCalendar value={day} today={today} marked={marked} onChange={setDay} className="max-lg:hidden" />
      </div>
      <section aria-live="polite" className="min-w-0">
        <div className="mb-3 mt-1 flex items-center justify-between gap-2.5">
          <h2 className="font-display text-[17px] font-semibold">{dayTitle(day, today)}</h2>
          <Badge tone="neutral">
            {items.length} {items.length === 1 ? "cita" : "citas"}
            {items.length ? ` · ${attended} atendidas` : ""}
          </Badge>
        </div>
        <AgendaTimeline
          items={items}
          now={day === today ? hhmm.format(new Date(nowMs)) : undefined}
          pendingId={pendingId}
          onToggle={markDone}
          emptyAction={
            <button type="button" onClick={onNew} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <CalendarPlus aria-hidden="true" className="size-4" />
              Agendar cita
            </button>
          }
        />
      </section>
    </div>
  );
}
