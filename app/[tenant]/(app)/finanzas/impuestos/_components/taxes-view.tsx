"use client";

import { MoneyInput } from "@/components/molecules/money-input";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { createResolutionAction, createTaxRateAction, loadDefaultTaxesAction, toggleResolutionAction, updateTaxRateAction, type TaxActionResult } from "@/app/[tenant]/(app)/finanzas/impuestos/actions";
import { DOCUMENT_LABELS, type DocumentKind } from "@/lib/business/sales/commercial-document";
import { TAX_KINDS, TAX_KIND_LABELS, NUMBERED_KINDS, todayCO, type TaxRateRow } from "@/lib/domains/finance/tax/tax";
import type { ResolutionRow } from "@/lib/domains/finance/tax/tax-db";
import { DateInput } from "@/components/molecules/date-input";

type Tab = "taxes" | "numbering";
const STATE_LABEL = { ok: "Vigente", inactive: "Desactivada", not_started: "Aún no rige", expired: "Vencida", exhausted: "Agotada" } as const;
const STATE_TONE = { ok: "success", inactive: "secondary", not_started: "outline", expired: "destructive", exhausted: "destructive" } as const;
const fmtPct = (n: number) => `${String(n).replace(".", ",")} %`;

export default function TaxesView({ slug, rates, resolutions }: { slug: string; rates: TaxRateRow[]; resolutions: ResolutionRow[] }) {
  const [tab, setTab] = useState<Tab>("taxes");
  const warned = resolutions.filter((r) => r.active && (r.status.warnings.length > 0 || r.status.state !== "ok"));
  return (
    <div className="grid gap-4">
      <div className="max-w-full overflow-x-auto pb-1">
        <SegmentedControl
          ariaLabel="Sección"
          value={tab}
          onChange={setTab}
          options={[
            { value: "taxes", label: "Impuestos y retenciones", count: rates.length },
            { value: "numbering", label: "Numeración", count: warned.length || undefined },
          ]}
        />
      </div>
      {tab === "taxes" ? <RatesPanel slug={slug} rates={rates} /> : <ResolutionsPanel slug={slug} resolutions={resolutions} />}
    </div>
  );
}

function useAction(slug: string) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<TaxActionResult>) =>
    start(async () => {
      const r = await fn();
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok) router.refresh();
    });
  return { run, pending, router, toast, slug };
}

function RatesPanel({ slug, rates }: { slug: string; rates: TaxRateRow[] }) {
  const [creating, setCreating] = useState(false);
  const { run, pending, router, toast } = useAction(slug);
  const today = todayCO();
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-ui text-muted-foreground">El IVA de cada venta sale de la tarifa que eliges en la línea; las retenciones se calculan con la tarifa vigente el día del documento.</p>
        <button type="button" onClick={() => setCreating(true)} className={buttonVariants()}>
          <Plus aria-hidden="true" className="size-4" /> Nueva tarifa
        </button>
      </div>
      {rates.length === 0 ? (
        <EmptyState title="Aún no tienes tarifas" description="Carga las habituales en Colombia (IVA 19 % y 5 %, impoconsumo, retefuente, reteIVA) y ajústalas con tu contador." action={<button type="button" disabled={pending} onClick={() => run(() => loadDefaultTaxesAction(slug))} className={buttonVariants()}>Cargar tarifas habituales</button>} />
      ) : (
        <AdaptiveTable
          caption="Impuestos y retenciones con su vigencia"
          rows={rates}
          getRowId={(r) => r.id}
          columns={[
            { key: "name", header: "Concepto", role: "primary", cell: (r) => r.name },
            { key: "code", header: "Código", role: "secondary", hideInList: false, cell: (r) => <span className="font-mono text-xs">{r.code}</span> },
            { key: "kind", header: "Tipo", role: "detail", cell: (r) => TAX_KIND_LABELS[r.kind] },
            {
              key: "rate",
              header: "Tarifa",
              role: "figure",
              cell: (r) => (
                <>
                  <span className="font-mono">{fmtPct(r.ratePct)}</span>
                  {r.minBase > 0 ? <small className="block text-xs font-normal text-muted-foreground">desde {r.minBase.toLocaleString("es-CO")}</small> : null}
                </>
              ),
            },
            { key: "validity", header: "Vigencia", role: "detail", cell: (r) => <>{r.validFrom} → {r.validTo ?? "sin fin"}</> },
            {
              key: "state",
              header: "Estado",
              role: "status",
              cell: (r) => {
                const inForce = r.active && r.validFrom <= today && (r.validTo === null || today <= r.validTo);
                return <Badge variant={inForce ? "success" : "secondary"}>{inForce ? "Vigente hoy" : r.active ? "Fuera de vigencia" : "Desactivada"}</Badge>;
              },
            },
            {
              key: "actions",
              header: "Acciones",
              role: "action",
              cell: (r) => {
                const inForce = r.active && r.validFrom <= today && (r.validTo === null || today <= r.validTo);
                return (
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    {inForce && r.validTo === null ? (
                      <button type="button" disabled={pending} aria-label={`Terminar vigencia de ${r.name}`} onClick={() => run(() => updateTaxRateAction(slug, r.id, { validTo: today }))} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Terminar vigencia
                      </button>
                    ) : null}
                    <button type="button" disabled={pending} aria-label={`${r.active ? "Desactivar" : "Activar"} ${r.name}`} onClick={() => run(() => updateTaxRateAction(slug, r.id, { active: !r.active }))} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      {r.active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                );
              },
            },
          ]}
        />
      )}
      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nueva tarifa"
        description="Si ya existe el mismo código, termina antes su vigencia para que no se pisen."
        submitLabel="Crear tarifa"
        pendingLabel="Creando…"
        onSubmit={async (d) => {
          const g = (k: string) => String(d.get(k) ?? "").trim();
          const r = await createTaxRateAction(slug, { code: g("code").toUpperCase(), name: g("name"), kind: g("kind"), ratePct: g("ratePct"), minBase: g("minBase"), validFrom: g("validFrom"), validTo: g("validTo") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Nombre" required error={fieldErrors.name}>{(c) => <input {...c} name="name" autoComplete="off" className={inputClasses} placeholder="IVA 19 %" />}</Field>
            <Field label="Código" required hint="Mayúsculas, números y guion bajo. Varias vigencias comparten código." error={fieldErrors.code}>{(c) => <input {...c} name="code" autoComplete="off" className={inputClasses} placeholder="IVA_19" />}</Field>
            <Field label="Tipo" required>
              {(c) => (
                <Select {...c} name="kind" defaultValue="IVA">
                  {TAX_KINDS.map((k) => <option key={k} value={k}>{TAX_KIND_LABELS[k]}</option>)}
                </Select>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tarifa (%)" required>{(c) => <input {...c} name="ratePct" inputMode="decimal" autoComplete="off" className={inputClasses} placeholder="19" />}</Field>
              <Field label="Base mínima" optional hint="Retenciones: desde qué valor se practican.">{(c) => <MoneyInput {...c} name="minBase" placeholder="0" />}</Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rige desde" required>{(c) => <DateInput {...c} name="validFrom" defaultValue={todayCO()} className={inputClasses} />}</Field>
              <Field label="Hasta" optional>{(c) => <DateInput {...c} name="validTo" className={inputClasses} />}</Field>
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
}

function ResolutionsPanel({ slug, resolutions }: { slug: string; resolutions: ResolutionRow[] }) {
  const [creating, setCreating] = useState(false);
  const { run, pending, router, toast } = useAction(slug);
  const year = new Date().getFullYear();
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-ui text-muted-foreground">Con una resolución activa, los documentos de ese tipo salen numerados dentro de su rango; sin resolución llevan el consecutivo interno.</p>
        <button type="button" onClick={() => setCreating(true)} className={buttonVariants()}>
          <Plus aria-hidden="true" className="size-4" /> Nueva resolución
        </button>
      </div>
      {resolutions.length === 0 ? (
        <EmptyState title="Sin resoluciones" description="Tus documentos llevan un consecutivo interno. Registra la resolución de la DIAN cuando la tengas." />
      ) : (
        <ul className="grid gap-3">
          {resolutions.map((r) => {
            const used = r.rangeTo - r.rangeFrom + 1 - r.status.remaining;
            const pct = Math.min(100, Math.round((used / (r.rangeTo - r.rangeFrom + 1)) * 100));
            return (
              <li key={r.id} className="grid gap-2 rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">{DOCUMENT_LABELS[r.documentKind as DocumentKind] ?? r.documentKind}</b>
                  {r.prefix ? <Badge variant="outline">Prefijo {r.prefix}</Badge> : null}
                  <Badge variant={STATE_TONE[r.status.state]}>{STATE_LABEL[r.status.state]}</Badge>
                  <button type="button" disabled={pending} aria-label={`${r.active ? "Desactivar" : "Activar"} la resolución ${r.resolutionNumber}`} onClick={() => run(() => toggleResolutionAction(slug, r.id, !r.active))} className={buttonVariants({ variant: "ghost", size: "sm", className: "ml-auto" })}>
                    {r.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
                <p className="text-ui text-muted-foreground">
                  Resolución <span className="font-mono">{r.resolutionNumber}</span> · rango {r.rangeFrom}–{r.rangeTo} · vigente {r.validFrom} → {r.validTo}
                </p>
                <div role="progressbar" aria-label={`Rango usado de la resolución ${r.resolutionNumber}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-ui">
                  Próximo número: <b className="font-mono">{r.status.state === "exhausted" ? "—" : `${r.prefix}${r.nextNumber}`}</b> · quedan <b>{r.status.remaining}</b>
                </p>
                {"message" in r.status && r.active ? <Alert tone="danger">{r.status.message}</Alert> : null}
                {r.status.warnings.map((w) => (
                  <Alert key={w} tone="warning">{w} Ve pidiendo la nueva resolución a la DIAN.</Alert>
                ))}
              </li>
            );
          })}
        </ul>
      )}
      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nueva resolución"
        description="Los datos que trae la resolución de numeración de la DIAN."
        submitLabel="Registrar resolución"
        pendingLabel="Registrando…"
        onSubmit={async (d) => {
          const g = (k: string) => String(d.get(k) ?? "").trim();
          const r = await createResolutionAction(slug, { documentKind: g("documentKind"), prefix: g("prefix"), resolutionNumber: g("resolutionNumber"), rangeFrom: g("rangeFrom"), rangeTo: g("rangeTo"), validFrom: g("validFrom"), validTo: g("validTo") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {() => (
          <div className="grid gap-3">
            <Field label="Tipo de documento" required>
              {(c) => (
                <Select {...c} name="documentKind" defaultValue="SALE">
                  {NUMBERED_KINDS.map((k) => <option key={k} value={k}>{DOCUMENT_LABELS[k]}</option>)}
                </Select>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Número de resolución" required>{(c) => <input {...c} name="resolutionNumber" autoComplete="off" className={inputClasses} placeholder="18760000001" />}</Field>
              <Field label="Prefijo" optional>{(c) => <input {...c} name="prefix" autoComplete="off" maxLength={6} className={inputClasses} placeholder="SETP" />}</Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Número inicial" required>{(c) => <input {...c} name="rangeFrom" inputMode="numeric" autoComplete="off" className={inputClasses} placeholder="1" />}</Field>
              <Field label="Número final" required>{(c) => <input {...c} name="rangeTo" inputMode="numeric" autoComplete="off" className={inputClasses} placeholder="5000" />}</Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vigente desde" required>{(c) => <DateInput {...c} name="validFrom" defaultValue={`${year}-01-01`} className={inputClasses} />}</Field>
              <Field label="Vigente hasta" required>{(c) => <DateInput {...c} name="validTo" defaultValue={`${year + 1}-12-31`} className={inputClasses} />}</Field>
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
