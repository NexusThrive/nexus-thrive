"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { MoneyInput } from "@/components/molecules/money-input";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { bogotaParts } from "@/lib/business/calendar";
import { formatCurrency } from "@/lib/format";
import { saveBookingAction } from "../agenda-actions";
import type { AgendaBooking, AgendaOption, AgendaService } from "./types";
import { Select } from "@/components/atoms/select";

/** Datos de la cita al tocar un día u hora del calendario (o al editarla). */
export default function BookingSheet({ slug, day, time, booking, customers, services, staff, onClose }: { slug: string; day: string; time: string; booking: AgendaBooking | null; customers: AgendaOption[]; services: AgendaService[]; staff: AgendaOption[]; onClose: () => void }) {
  const p = booking ? bogotaParts(booking.start) : null;
  const [v, setV] = useState({
    customerId: booking?.customerId ?? "",
    productId: booking?.productId ?? "",
    serviceName: booking?.serviceName ?? "",
    day: p?.day ?? day,
    time: p ? `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}` : time,
    duration: booking ? Math.round((booking.end - booking.start) / 60_000) : 60,
    staffUserId: booking?.staffUserId ?? "",
    partySize: booking?.partySize ?? 1,
    amount: booking ? booking.amount : (null as number | null),
    notes: booking?.notes ?? "",
  });
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const service = services.find((s) => s.id === v.productId);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  const err = (f: string) => (error?.field === f ? error.message : undefined);

  const save = () =>
    start(async () => {
      const r = await saveBookingAction(slug, {
        id: booking?.id ?? null,
        customerId: v.customerId,
        productId: v.productId || null,
        serviceName: v.serviceName,
        day: v.day,
        time: v.time,
        durationMinutes: v.duration,
        staffUserId: v.staffUserId || null,
        partySize: v.partySize,
        amount: v.amount,
        notes: v.notes,
      });
      if (r.ok) {
        toast(r.message ?? "Listo", "success");
        router.refresh();
        onClose();
      } else {
        setError({ field: r.field, message: r.message });
        if (!r.field) toast({ title: "No se agendó", description: r.message, variant: "error" });
      }
    });

  const dateLabel = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${v.day}T12:00:00Z`));

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => !o && !pending && onClose()}
      title={booking ? "Editar cita" : "Agendar cita"}
      description={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={save} className={buttonVariants()}>
            {pending ? "Guardando…" : booking ? "Guardar" : "Agendar"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Cliente" required error={err("customerId")} className="sm:col-span-2">
          {(c) => (
            <Select {...c} value={v.customerId} onChange={(e) => set("customerId", e.target.value)}>
              <option value="">Elige…</option>
              {customers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Servicio" error={err("productId") ?? err("serviceName")} className="sm:col-span-2">
          {(c) => (
            <Select
              {...c}
              value={v.productId}
              onChange={(e) => {
                const s = services.find((x) => x.id === e.target.value);
                setV((x) => ({ ...x, productId: e.target.value, duration: s?.durationMinutes ?? x.duration, amount: s ? s.price * x.partySize : x.amount }));
              }}
            >
              <option value="">Otro (escribir)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatCurrency(s.price)}
                  {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
                  {s.capacity ? ` · cupo ${s.capacity}` : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {!v.productId ? (
          <Field label="¿Qué servicio?" required className="sm:col-span-2">
            {(c) => <input {...c} value={v.serviceName} onChange={(e) => set("serviceName", e.target.value)} className={inputClasses} placeholder="Valoración inicial" />}
          </Field>
        ) : null}
        <Field label="Día">{(c) => <input {...c} type="date" value={v.day} onChange={(e) => set("day", e.target.value)} className={inputClasses} />}</Field>
        <Field label="Hora" error={err("time")}>{(c) => <input {...c} type="time" step={900} value={v.time} onChange={(e) => set("time", e.target.value)} className={inputClasses} />}</Field>
        <Field label="Duración (minutos)" error={err("durationMinutes")}>
          {(c) => <input {...c} inputMode="numeric" value={v.duration} onChange={(e) => set("duration", Number(e.target.value.replace(/\D/g, "")) || 0)} className={inputClasses} />}
        </Field>
        <Field label="Personas" error={err("partySize")} hint={service?.capacity ? `Cupo del servicio: ${service.capacity}` : undefined}>
          {(c) => (
            <input
              {...c}
              inputMode="numeric"
              value={v.partySize}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, "")) || 1;
                setV((x) => ({ ...x, partySize: n, amount: service ? service.price * n : x.amount }));
              }}
              className={inputClasses}
            />
          )}
        </Field>
        <Field label="Atiende" error={err("staffUserId")}>
          {(c) => (
            <Select {...c} value={v.staffUserId} onChange={(e) => set("staffUserId", e.target.value)}>
              <option value="">Sin asignar</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Valor">{(c) => <MoneyInput id={c.id} value={v.amount} onValueChange={(x) => set("amount", x)} />}</Field>
        <Field label="Notas" className="sm:col-span-2">
          {(c) => <textarea {...c} rows={2} value={v.notes} onChange={(e) => set("notes", e.target.value)} className={textareaClasses} />}
        </Field>
        {error && error.field ? <p className="text-[13px] text-danger sm:col-span-2">{error.message}</p> : null}
      </div>
    </ResponsiveSheet>
  );
}
