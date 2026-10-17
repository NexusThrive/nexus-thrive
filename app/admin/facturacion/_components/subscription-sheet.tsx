"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, selectClasses, textareaClasses } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { Field } from "@/components/molecules/field";
import { UsdInput } from "@/components/molecules/usd-input";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { periodAmount, periodEnd, type Cycle } from "@/lib/ops/billing-rules";
import type { SubscriptionRow } from "@/lib/ops/billing";
import { formatUsdCents } from "@/lib/plans/quote";
import { createSubscriptionAction, updateSubscriptionAction } from "../actions";
import { useBilling } from "./use-billing";

export type NewSubscription = { tenantId: string; name: string; plan: string; billingCycle: Cycle; monthlyCents: number };

/** Crear la suscripción de un negocio (con el plan que eligió) o editarla. */
export default function SubscriptionSheet({ create, edit, onClose, today, canPrice }: { create?: NewSubscription; edit?: SubscriptionRow; onClose: () => void; today: string; canPrice: boolean }) {
  const { run, pending } = useBilling();
  const [plan, setPlan] = useState(create?.plan ?? edit?.plan ?? "ESSENTIAL");
  const [cycle, setCycle] = useState<Cycle>(create?.billingCycle ?? edit?.billingCycle ?? "MONTHLY");
  const [cents, setCents] = useState(create?.monthlyCents ?? edit?.priceUsdCents ?? 0);
  const [start, setStart] = useState(today);
  const [trial, setTrial] = useState(false);
  const [status, setStatus] = useState<string>(edit?.status ?? "ACTIVE");
  const [notes, setNotes] = useState(edit?.notes ?? "");
  const [cancelReason, setCancelReason] = useState("");
  const name = create?.name ?? edit?.tenantName ?? "";

  const save = () =>
    create
      ? run(() => createSubscriptionAction({ tenantId: create.tenantId, plan, cycle, monthlyCents: cents, startDate: start, trial }), onClose)
      : run(() => updateSubscriptionAction(edit!.id, { priceUsdCents: cents, billingCycle: cycle, status, notes, cancelReason }), onClose);

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={create ? `Suscripción · ${name}` : `Editar suscripción · ${name}`}
      description={create ? "Toma el plan que eligió al registrarse. El precio queda fijo aunque cambie el catálogo." : "Los cambios de precio aplican desde el próximo cobro."}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={save} className={buttonVariants()}>
            {pending ? "Guardando…" : create ? "Crear suscripción" : "Guardar"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Plan">
          {(c) => (
            <select {...c} disabled={!create} value={plan} onChange={(e) => setPlan(e.target.value)} className={selectClasses}>
              <option value="ESSENTIAL">Essential</option>
              <option value="ELITE">Elite</option>
              <option value="SIGNATURE">Signature</option>
            </select>
          )}
        </Field>
        <Field label="Ciclo">
          {(c) => (
            <select {...c} value={cycle} onChange={(e) => setCycle(e.target.value as Cycle)} className={selectClasses}>
              <option value="MONTHLY">Mensual</option>
              <option value="ANNUAL">Anual</option>
            </select>
          )}
        </Field>
        <Field label="Precio mensual" hint={cycle === "ANNUAL" ? `Se cobra ${formatUsdCents(periodAmount(cents, cycle))} al año.` : undefined}>
          {(c) => <UsdInput id={c.id} value={cents} disabled={!create && !canPrice} onChange={setCents} />}
        </Field>
        {create ? (
          <Field label="Inicio" hint={`Primer período hasta ${periodEnd(start, cycle)}.`}>
            {(c) => <input {...c} type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputClasses} />}
          </Field>
        ) : (
          <Field label="Estado">
            {(c) => (
              <select {...c} value={status} onChange={(e) => setStatus(e.target.value)} className={selectClasses}>
                <option value="TRIAL">Prueba</option>
                <option value="ACTIVE">Activa</option>
                <option value="CANCELLED">Cancelada</option>
                {edit?.status === "SUSPENDED" ? <option value="SUSPENDED">Suspendida (se reactiva al confirmar el pago)</option> : null}
              </select>
            )}
          </Field>
        )}
        {create ? (
          <label htmlFor="sub-trial" className="flex items-center justify-between gap-3 rounded-md bg-surface-muted p-3 sm:col-span-2">
            <span>
              <b className="block text-[13.5px] font-medium">Empieza en prueba</b>
              <small className="text-xs text-muted-foreground">No genera cobro ahora; el primero se genera al renovar.</small>
            </span>
            <Switch id="sub-trial" checked={trial} onCheckedChange={setTrial} />
          </label>
        ) : null}
        {status === "CANCELLED" && edit?.status !== "CANCELLED" ? (
          <Field label="Motivo de la cancelación" required className="sm:col-span-2">
            {(c) => <input {...c} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className={inputClasses} />}
          </Field>
        ) : null}
        {!create ? (
          <Field label="Notas" className="sm:col-span-2">
            {(c) => <textarea {...c} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClasses} />}
          </Field>
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
