"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, Pencil, X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { bogotaParts, reminderText } from "@/lib/business/calendar";
import { formatCurrency } from "@/lib/format";
import { markReminderAction, setBookingStatusAction } from "../agenda-actions";
import type { AgendaBooking } from "./types";

export const STATUS = { PENDING: { label: "Por confirmar", tone: "warning" }, CONFIRMED: { label: "Confirmada", tone: "success" }, COMPLETED: { label: "Completada", tone: "neutral" }, CANCELLED: { label: "Cancelada", tone: "muted" } } as const;

const hhmm = (ms: number) => {
  const p = bogotaParts(ms);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
};

/** Ficha de la cita: estado, recordatorio por WhatsApp y editar. */
export default function BookingDetail({ slug, booking, business, onEdit, onClose }: { slug: string; booking: AgendaBooking; business: string; onEdit: () => void; onClose: () => void }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message) toast(r.message, "success");
        router.refresh();
        onClose();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });
  const digits = (booking.customerPhone ?? "").replace(/\D/g, "");
  const to = digits.length === 10 ? `57${digits}` : digits;
  const wa = to ? `https://wa.me/${to}?text=${encodeURIComponent(reminderText({ customer: booking.customerName, service: booking.serviceName, start: booking.start, business }))}` : null;
  const open = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const p = bogotaParts(booking.start);
  const dayLabel = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${p.day}T12:00:00Z`));

  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && onClose()} title={booking.serviceName} description={`${dayLabel} · ${hhmm(booking.start)}–${hhmm(booking.end)}`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={STATUS[booking.status].tone}>{STATUS[booking.status].label}</Badge>
          {booking.reminderSent ? <Badge tone="neutral">Recordatorio enviado</Badge> : null}
          {booking.partySize > 1 ? <Badge tone="neutral">{booking.partySize} personas</Badge> : null}
        </div>
        <dl className="grid gap-2 text-[13.5px]">
          {[
            ["Cliente", booking.customerName],
            ["Atiende", booking.staffName ?? "Sin asignar"],
            ["Valor", formatCurrency(booking.amount)],
            ["Notas", booking.notes ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          {wa && open ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => void markReminderAction(slug, booking.id).then(() => router.refresh())} className={buttonVariants({ size: "sm" })}>
              <MessageCircle aria-hidden="true" className="size-3.5" /> Recordar por WhatsApp
            </a>
          ) : null}
          {booking.status === "PENDING" ? (
            <button type="button" disabled={pending} onClick={() => run(() => setBookingStatusAction(slug, booking.id, "CONFIRMED"))} className={buttonVariants({ size: "sm", variant: "outline" })}>
              <Check aria-hidden="true" className="size-3.5" /> Confirmar
            </button>
          ) : null}
          {open ? (
            <>
              <button type="button" disabled={pending} onClick={() => run(() => setBookingStatusAction(slug, booking.id, "COMPLETED"))} className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Check aria-hidden="true" className="size-3.5" /> Asistió
              </button>
              <button type="button" onClick={onEdit} className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Pencil aria-hidden="true" className="size-3.5" /> Mover o editar
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => setBookingStatusAction(slug, booking.id, "CANCELLED"))} className={buttonVariants({ size: "sm", variant: "ghost", className: "text-danger" })}>
                <X aria-hidden="true" className="size-3.5" /> Cancelar cita
              </button>
            </>
          ) : null}
        </div>
      </div>
    </ResponsiveSheet>
  );
}
