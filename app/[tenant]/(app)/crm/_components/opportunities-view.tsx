"use client";

import { MoneyInput } from "@/components/molecules/money-input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { DateInput } from "@/components/molecules/date-input";
import { FormDialog } from "@/components/organisms/form-sheet";
import { createOpportunityAction, loseAction, moveStageAction, nextActionAction, winAction, type OppResult } from "@/app/[tenant]/(app)/crm/actions";
import { OPEN_STAGES, STAGE_TEXT, isOverdue } from "@/lib/business/growth/opportunities";
import type { OpportunityRow } from "@/lib/business/growth/opportunities-db";
import { formatCurrency } from "@/lib/foundation/format";

type Tab = "open" | "won" | "lost";
type Dialog = { kind: "new" } | { kind: "next" | "lose"; row: OpportunityRow } | null;

/** Oportunidades abiertas (la acción vencida primero), ganadas y perdidas. Ganar o perder no duplica al contacto. */
export default function OpportunitiesView({ slug, open, won, lost, customers, today }: { slug: string; open: OpportunityRow[]; won: OpportunityRow[]; lost: OpportunityRow[]; customers: { id: string; name: string }[]; today: string }) {
  const [tab, setTab] = useState<Tab>("open");
  const [dialog, setDialog] = useState<Dialog>(null);
  const router = useRouter();
  const { toast } = useToast();
  const rows = tab === "open" ? open : tab === "won" ? won : lost;
  const act = async (fn: () => Promise<OppResult>) => {
    const r = await fn();
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
  };
  const done = (message?: string) => {
    if (message) toast(message, "success");
    router.refresh();
  };
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentedControl ariaLabel="Estado" value={tab} onChange={setTab} options={[{ value: "open", label: "Abiertas", count: open.length || undefined }, { value: "won", label: "Ganadas" }, { value: "lost", label: "Perdidas" }]} />
        </div>
        <button type="button" onClick={() => setDialog({ kind: "new" })} className={buttonVariants({ className: "ml-auto" })}>
          <Plus aria-hidden="true" className="size-4" /> Nueva oportunidad
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState mark="page" remember={tab === "open"} title={tab === "open" ? "Sin oportunidades abiertas" : tab === "won" ? "Aún no has ganado ninguna" : "Ninguna perdida"} description={tab === "open" ? "Cuando alguien escriba desde tu sitio o la crees tú, aparecerá aquí con su siguiente paso." : "Aquí quedan las que cierres."} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {rows.map((o) => (
            <li key={o.id} className="grid gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="min-w-0 break-words text-ui font-medium">{o.customerName}</b>
                <Badge variant={o.status === "WON" ? "success" : o.status === "LOST" ? "secondary" : "warning"}>{o.status === "OPEN" ? STAGE_TEXT[o.stage] : o.status === "WON" ? "Ganada" : "Perdida"}</Badge>
                {o.estimatedValue ? <span className="ml-auto font-mono text-ui font-semibold tabular-nums">{formatCurrency(o.estimatedValue)}</span> : null}
              </div>
              <p className="break-words text-ui text-muted-foreground">{o.interest}</p>
              {o.status === "OPEN" ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {o.nextAction ? (
                    <span className={isOverdue(o.nextActionAt) ? "font-medium text-danger" : undefined}>
                      Siguiente: {o.nextAction}
                      {o.nextActionAt ? ` · ${o.nextActionAt.slice(0, 10)}${isOverdue(o.nextActionAt) ? " (vencida)" : ""}` : ""}
                    </span>
                  ) : (
                    <span>Sin siguiente paso</span>
                  )}
                  <span className="ml-auto flex flex-wrap items-center gap-2">
                    <Select aria-label={`Etapa de ${o.customerName}`} value={o.stage} onChange={(e) => act(() => moveStageAction(slug, o.id, e.target.value))}>
                      {OPEN_STAGES.map((s) => <option key={s} value={s}>{STAGE_TEXT[s]}</option>)}
                    </Select>
                    <button type="button" onClick={() => setDialog({ kind: "next", row: o })} className={buttonVariants({ variant: "outline", size: "sm" })}>Siguiente paso</button>
                    <button type="button" onClick={() => act(() => winAction(slug, o.id))} className={buttonVariants({ variant: "outline", size: "sm" })}>Ganada</button>
                    <button type="button" onClick={() => setDialog({ kind: "lose", row: o })} className={buttonVariants({ variant: "ghost", size: "sm" })}>Perdida</button>
                  </span>
                </div>
              ) : o.lostReason ? (
                <p className="text-xs text-muted-foreground">Motivo: {o.lostReason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={dialog?.kind === "new"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Nueva oportunidad"
        description="Elige a la persona y qué le interesa. Si aún no está en tus clientes, créala primero."
        submitLabel="Crear"
        pendingLabel="Creando…"
        onSubmit={async (d) => {
          const value = Number(String(d.get("value") ?? "").replace(/[^\d,]/g, "").replace(",", "."));
          const r = await createOpportunityAction(slug, { customerId: String(d.get("customerId") ?? ""), interest: String(d.get("interest") ?? ""), estimatedValue: Number.isFinite(value) && value > 0 ? value : null, nextAction: String(d.get("nextAction") ?? ""), nextActionDay: String(d.get("nextDay") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { interest: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Persona" required>
              {(c) => (
                <Select {...c} name="customerId" defaultValue={customers[0]?.id}>
                  {customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Qué le interesa" required error={fieldErrors.interest}>{(c) => <input {...c} name="interest" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Ej.: 40 camisetas con logo" />}</Field>
            <Field label="Valor estimado (COP)">{(c) => <MoneyInput {...c} name="value" />}</Field>
            <Field label="Siguiente paso">{(c) => <input {...c} name="nextAction" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Ej.: Enviar cotización" />}</Field>
            <Field label="Para cuándo">{(c) => <DateInput {...c} name="nextDay" defaultValue={today} />}</Field>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={dialog?.kind === "next"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Siguiente paso"
        description={dialog?.kind === "next" ? `${dialog.row.customerName} · ${dialog.row.interest}` : undefined}
        submitLabel="Guardar"
        pendingLabel="Guardando…"
        onSubmit={async (d) => {
          const r = await nextActionAction(slug, (dialog as { row: OpportunityRow }).row.id, String(d.get("action") ?? ""), String(d.get("day") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { action: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Qué sigue" required error={fieldErrors.action}>{(c) => <input {...c} name="action" autoComplete="off" maxLength={200} className={inputClasses} defaultValue={dialog?.kind === "next" ? (dialog.row.nextAction ?? "") : ""} />}</Field>
            <Field label="Para cuándo">{(c) => <DateInput {...c} name="day" defaultValue={today} />}</Field>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={dialog?.kind === "lose"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Marcar como perdida"
        description={dialog?.kind === "lose" ? `${dialog.row.customerName} · ${dialog.row.interest}` : undefined}
        submitLabel="Marcar perdida"
        pendingLabel="Guardando…"
        destructive
        onSubmit={async (d) => {
          const r = await loseAction(slug, (dialog as { row: OpportunityRow }).row.id, String(d.get("reason") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { reason: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => <Field label="Por qué se perdió" required error={fieldErrors.reason}>{(c) => <input {...c} name="reason" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Ej.: compró en otro lado" />}</Field>}
      </FormDialog>
    </div>
  );
}
