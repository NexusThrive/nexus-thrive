"use client";

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
import { createResolutionAction, createTaxRateAction, loadDefaultTaxesAction, toggleResolutionAction, updateTaxRateAction, type TaxActionResult } from "@/app/[tenant]/(app)/taxes/actions";
import { DOCUMENT_LABELS, type DocumentKind } from "@/lib/business/commercial-document";
import { TAX_KINDS, TAX_KIND_LABELS, NUMBERED_KINDS, todayCO, type TaxRateRow } from "@/lib/tax/tax";
import type { ResolutionRow } from "@/lib/tax/tax-db";

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
        <p className="mr-auto text-[13px] text-muted-foreground">El IVA de cada venta sale de la tarifa que eliges en la línea; las retenciones se calculan con la tarifa vigente el día del documento.</p>
        <button type="button" onClick={() => setCreating(true)} className={buttonVariants()}>
          <Plus aria-hidden="true" className="size-4" /> Nueva tarifa
        </button>
      </div>
      {rates.length === 0 ? (
        <EmptyState title="Aún no tienes tarifas" description="Carga las habituales en Colombia (IVA 19 % y 5 %, impoconsumo, retefuente, reteIVA) y ajústalas con tu contador." action={<button type="button" disabled={pending} onClick={() => run(() => loadDefaultTaxesAction(slug))} className={buttonVariants()}>Cargar tarifas habituales</button>} />
      ) : (
        <div role="region" aria-label="Tarifas" tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-accent">
          <table className="w-full min-w-[720px] text-[13px]">
            <caption className="sr-only">Impuestos y retenciones con su vigencia</caption>
            <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Concepto</th>
                <th scope="col" className="px-3 py-2 font-medium">Tipo</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Tarifa</th>
                <th scope="col" className="px-3 py-2 font-medium">Vigencia</th>
                <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.map((r) => {
                const inForce = r.active && r.validFrom <= today && (r.validTo === null || today <= r.validTo);
                return (
                  <tr key={r.id}>
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {r.name}
                      <small className="block font-mono text-xs font-normal text-muted-foreground">{r.code}</small>
                    </th>
                    <td className="px-3 py-2">{TAX_KIND_LABELS[r.kind]}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {fmtPct(r.ratePct)}
                      {r.minBase > 0 ? <small className="block text-xs text-muted-foreground">desde {r.minBase.toLocaleString("es-CO")}</small> : null}
                    </td>
                    <td className="px-3 py-2">{r.validFrom} → {r.validTo ?? "sin fin"}</td>
                    <td className="px-3 py-2"><Badge variant={inForce ? "success" : "secondary"}>{inForce ? "Vigente hoy" : r.active ? "Fuera de vigencia" : "Desactivada"}</Badge></td>
                    <td className="px-3 py-2 text-right">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
              <Field label="Base mínima" optional hint="Retenciones: desde qué valor se practican.">{(c) => <input {...c} name="minBase" inputMode="decimal" autoComplete="off" className={inputClasses} placeholder="0" />}</Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rige desde" required>{(c) => <input {...c} name="validFrom" type="date" defaultValue={todayCO()} className={inputClasses} />}</Field>
              <Field label="Hasta" optional>{(c) => <input {...c} name="validTo" type="date" className={inputClasses} />}</Field>
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
        <p className="mr-auto text-[13px] text-muted-foreground">Con una resolución activa, los documentos de ese tipo salen numerados dentro de su rango; sin resolución llevan el consecutivo interno.</p>
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
                  <b className="text-[14px]">{DOCUMENT_LABELS[r.documentKind as DocumentKind] ?? r.documentKind}</b>
                  {r.prefix ? <Badge variant="outline">Prefijo {r.prefix}</Badge> : null}
                  <Badge variant={STATE_TONE[r.status.state]}>{STATE_LABEL[r.status.state]}</Badge>
                  <button type="button" disabled={pending} aria-label={`${r.active ? "Desactivar" : "Activar"} la resolución ${r.resolutionNumber}`} onClick={() => run(() => toggleResolutionAction(slug, r.id, !r.active))} className={buttonVariants({ variant: "ghost", size: "sm", className: "ml-auto" })}>
                    {r.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  Resolución <span className="font-mono">{r.resolutionNumber}</span> · rango {r.rangeFrom}–{r.rangeTo} · vigente {r.validFrom} → {r.validTo}
                </p>
                <div role="progressbar" aria-label={`Rango usado de la resolución ${r.resolutionNumber}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[13px]">
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
              <Field label="Vigente desde" required>{(c) => <input {...c} name="validFrom" type="date" defaultValue={`${year}-01-01`} className={inputClasses} />}</Field>
              <Field label="Vigente hasta" required>{(c) => <input {...c} name="validTo" type="date" defaultValue={`${year + 1}-12-31`} className={inputClasses} />}</Field>
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
