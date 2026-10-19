"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { WEEKDAYS, type MuseumSettings } from "@/lib/business/museum";
import { formatCurrency } from "@/lib/format";
import { saveMuseumSettingsAction, seedTicketTypesAction, type TicketResult } from "../actions";

/** Aforo por franja, horarios, días de cierre, duración de la guiada y tipos de entrada. */
export default function MuseumSettingsForm({ slug, settings, canManage, ticketTypes }: { slug: string; settings: MuseumSettings; canManage: boolean; ticketTypes: { id: string; name: string; price: number }[] }) {
  const [capacity, setCapacity] = useState(String(settings.capacityPerSlot));
  const [slots, setSlots] = useState(settings.slots.join(", "));
  const [closed, setClosed] = useState<number[]>(settings.closedWeekdays);
  const [guided, setGuided] = useState(String(settings.guidedMinutes));
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const run = (p: () => Promise<TicketResult>) =>
    start(async () => {
      const r = await p();
      if (r.ok) {
        toast(r.message ?? "Listo", "success");
        router.refresh();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="grid content-start gap-4 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Aforo y horarios</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Aforo por franja" hint="Personas a la vez">{(c) => <input {...c} disabled={!canManage} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))} className={inputClasses} />}</Field>
          <Field label="Visita guiada" hint="Minutos en la agenda">{(c) => <input {...c} disabled={!canManage} inputMode="numeric" value={guided} onChange={(e) => setGuided(e.target.value.replace(/\D/g, ""))} className={inputClasses} />}</Field>
        </div>
        <Field label="Franjas de ingreso" hint="Horas separadas por coma: 09:00, 10:00, 11:30">
          {(c) => <input {...c} disabled={!canManage} value={slots} onChange={(e) => setSlots(e.target.value)} className={inputClasses} />}
        </Field>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[13px] font-medium">Días de cierre</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px]">
                <input type="checkbox" disabled={!canManage} checked={closed.includes(i)} onChange={(e) => setClosed((c) => (e.target.checked ? [...c, i] : c.filter((x) => x !== i)))} />
                {d}
              </label>
            ))}
          </div>
        </fieldset>
        {canManage ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => saveMuseumSettingsAction(slug, { capacityPerSlot: Number(capacity), slots, closedWeekdays: closed, guidedMinutes: Number(guided) }))}
            className={buttonVariants({ size: "sm", className: "justify-self-start" })}
          >
            Guardar ajustes
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">Solo el dueño o administración cambian estos ajustes.</p>
        )}
      </section>

      <section className="grid content-start gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Tipos de entrada</h2>
        {ticketTypes.length ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {ticketTypes.map((t) => (
              <li key={t.id} className="flex justify-between px-3 py-2 text-sm">
                <span>{t.name}</span>
                <span className="font-mono tabular-nums">{formatCurrency(t.price)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">Crea las entradas sugeridas (general, estudiante, niño, adulto mayor, extranjero y colegio) y ajusta los precios después.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {!ticketTypes.length && canManage ? (
            <button type="button" disabled={pending} onClick={() => run(() => seedTicketTypesAction(slug))} className={buttonVariants({ size: "sm" })}>
              Crear entradas sugeridas
            </button>
          ) : null}
          <Link href={`/${slug}/inventory`} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Editar precios en Catálogo
          </Link>
        </div>
      </section>
    </div>
  );
}
