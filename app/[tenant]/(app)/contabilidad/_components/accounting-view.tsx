"use client";

import { useMemo, useState } from "react";
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
import { FormDialog } from "@/components/organisms/form-sheet";
import { closePeriodAction, createAccountAction, createCostCenterAction, loadPucAction, reopenPeriodAction, toggleAccountAction, toggleCostCenterAction, toggleRuleAction, type AccResult } from "@/app/[tenant]/(app)/contabilidad/actions";
import { TYPE_LABELS, periodLabel } from "@/lib/accounting/puc";
import type { AccountRow, CostCenterRow, PeriodRow, RuleRow } from "@/lib/accounting/accounting-db";

type Tab = "puc" | "rules" | "centers" | "periods";
const AMOUNT_TEXT = { total: "total", subtotal: "subtotal", tax: "IVA", cost: "costo", payment: "valor cobrado/pagado", withholding: "retención", tip: "propina" } as const;

export default function AccountingView({ slug, accounts, rules, centers, periods, today, canReopen }: { slug: string; accounts: AccountRow[]; rules: RuleRow[]; centers: CostCenterRow[]; periods: PeriodRow[]; today: string; canReopen: boolean }) {
  const [tab, setTab] = useState<Tab>("puc");
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<"account" | "center" | null>(null);
  const [reopen, setReopen] = useState<PeriodRow | null>(null);
  const [q, setQ] = useState("");
  const run = async (fn: () => Promise<AccResult>) => {
    const r = await fn();
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
  };
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? accounts.filter((a) => a.code.startsWith(t) || a.name.toLowerCase().includes(t)) : accounts;
  }, [accounts, q]);
  // Los últimos 12 meses (los que no tienen registro están abiertos).
  const months = useMemo(() => {
    const y0 = Number(today.slice(0, 4));
    const m0 = Number(today.slice(5, 7));
    const known = new Map(periods.map((p) => [p.year * 12 + p.month - 1, p]));
    return Array.from({ length: 12 }, (_, i) => {
      const k = y0 * 12 + (m0 - 1) - i;
      const year = Math.floor(k / 12);
      const month = (k % 12) + 1;
      return { year, month, status: known.get(k)?.status ?? "OPEN", current: i === 0 } as { year: number; month: number; status: "OPEN" | "CLOSED"; current: boolean };
    });
  }, [periods, today]);

  return (
    <div className="grid gap-4">
      <div className="max-w-full overflow-x-auto pb-1">
        <SegmentedControl ariaLabel="Sección" value={tab} onChange={setTab} options={[{ value: "puc", label: "Plan de cuentas", count: accounts.length }, { value: "rules", label: "Reglas de asientos", count: rules.length }, { value: "centers", label: "Centros de costo" }, { value: "periods", label: "Períodos" }]} />
      </div>

      {tab === "puc" ? (
        accounts.length === 0 ? (
          <EmptyState title="Aún no tienes plan de cuentas" description="Carga la plantilla del PUC colombiano y ajústala con tu contador." action={<button type="button" onClick={() => run(() => loadPucAction(slug))} className={buttonVariants()}>Cargar el PUC</button>} />
        ) : (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <input aria-label="Buscar cuenta" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código o nombre" className={`${inputClasses} max-w-xs`} />
              <button type="button" onClick={() => setDialog("account")} className={buttonVariants({ className: "ml-auto" })}><Plus aria-hidden="true" className="size-4" /> Nueva cuenta</button>
            </div>
            <div role="region" aria-label="Cuentas" tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-accent">
              <table className="w-full min-w-[640px] text-[13px]">
                <caption className="sr-only">Plan de cuentas</caption>
                <thead className="bg-surface-muted text-left text-xs text-muted-foreground"><tr><th scope="col" className="px-3 py-2 font-medium">Código</th><th scope="col" className="px-3 py-2 font-medium">Nombre</th><th scope="col" className="px-3 py-2 font-medium">Clase</th><th scope="col" className="px-3 py-2 font-medium">Naturaleza</th><th scope="col" className="px-3 py-2"><span className="sr-only">Acciones</span></th></tr></thead>
                <tbody className="divide-y divide-border">
                  {shown.map((a) => (
                    <tr key={a.id} className={a.active ? "" : "opacity-55"}>
                      <th scope="row" className="px-3 py-1.5 text-left font-mono font-normal" style={{ paddingLeft: `${12 + Math.max(0, a.code.length - 1) * 4}px` }}>{a.code}</th>
                      <td className={`px-3 py-1.5 ${a.postable ? "" : "font-semibold"}`}>{a.name}{!a.postable ? <Badge variant="outline" className="ml-2">Agrupa</Badge> : null}</td>
                      <td className="px-3 py-1.5">{TYPE_LABELS[a.type]}</td>
                      <td className="px-3 py-1.5">{a.nature === "D" ? "Débito" : "Crédito"}</td>
                      <td className="px-3 py-1.5 text-right">{a.postable ? <button type="button" aria-label={`${a.active ? "Desactivar" : "Activar"} la cuenta ${a.code}`} onClick={() => run(() => toggleAccountAction(slug, a.id, !a.active))} className={buttonVariants({ variant: "ghost", size: "sm" })}>{a.active ? "Desactivar" : "Activar"}</button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">Plantilla de uso común: confírmala con tu contador. Desactivar una cuenta la oculta de los asientos nuevos; no toca lo ya contabilizado.</p>
          </div>
        )
      ) : null}

      {tab === "rules" ? (
        <ul className="grid gap-3">
          {rules.map((r) => (
            <li key={r.id} className="grid gap-2 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <b className="text-[14px]">{r.name}</b>
                <Badge variant={r.active ? "success" : "secondary"}>{r.active ? "Activa" : "Desactivada"}</Badge>
                <button type="button" aria-label={`${r.active ? "Desactivar" : "Activar"} la regla ${r.name}`} onClick={() => run(() => toggleRuleAction(slug, r.id, !r.active))} className={buttonVariants({ variant: "ghost", size: "sm", className: "ml-auto" })}>{r.active ? "Desactivar" : "Activar"}</button>
              </div>
              <ul className="grid gap-1 text-[13px]">
                {r.lines.map((l, i) => (
                  <li key={i} className="flex gap-3">
                    <span className={`w-14 font-mono font-semibold ${l.side === "D" ? "" : "text-muted-foreground"}`}>{l.side === "D" ? "Débito" : "Crédito"}</span>
                    <span className="w-14 font-mono">{l.account}</span>
                    <span>{l.label} <span className="text-muted-foreground">· {AMOUNT_TEXT[l.amount]}</span></span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "centers" ? (
        <div className="grid gap-3">
          <button type="button" onClick={() => setDialog("center")} className={buttonVariants({ className: "justify-self-end" })}><Plus aria-hidden="true" className="size-4" /> Nuevo centro o sucursal</button>
          {centers.length === 0 ? <EmptyState title="Sin centros de costo" description="Crea centros de costo o sucursales para separar en qué parte del negocio se gasta y se vende." /> : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {centers.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3 text-[13.5px]">
                  <span className="w-20 font-mono">{c.code}</span>
                  <b className="font-medium">{c.name}</b>
                  <Badge variant="outline">{c.kind === "BRANCH" ? "Sucursal" : "Centro de costo"}</Badge>
                  <button type="button" aria-label={`${c.active ? "Desactivar" : "Activar"} ${c.name}`} onClick={() => run(() => toggleCostCenterAction(slug, c.id, !c.active))} className={buttonVariants({ variant: "ghost", size: "sm", className: "ml-auto" })}>{c.active ? "Desactivar" : "Activar"}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "periods" ? (
        <div className="grid gap-3">
          <p className="text-[13px] text-muted-foreground">Un mes cerrado no admite asientos nuevos ni cambios. Los cierres van en orden y solo se cierra un mes que ya terminó; reabrir exige un motivo y lo hace el dueño.</p>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {months.map((m) => (
              <li key={`${m.year}-${m.month}`} className="flex items-center gap-3 px-4 py-2.5 text-[13.5px]">
                <span className="capitalize">{periodLabel(m.year, m.month)}</span>
                <Badge variant={m.status === "CLOSED" ? "secondary" : "success"}>{m.status === "CLOSED" ? "Cerrado" : m.current ? "En curso" : "Abierto"}</Badge>
                {m.status === "OPEN" && !m.current ? <button type="button" aria-label={`Cerrar ${periodLabel(m.year, m.month)}`} onClick={() => run(() => closePeriodAction(slug, m.year, m.month))} className={buttonVariants({ variant: "outline", size: "sm", className: "ml-auto" })}>Cerrar mes</button> : null}
                {m.status === "CLOSED" && canReopen ? <button type="button" aria-label={`Reabrir ${periodLabel(m.year, m.month)}`} onClick={() => setReopen({ year: m.year, month: m.month, status: "CLOSED", closedAt: null })} className={buttonVariants({ variant: "ghost", size: "sm", className: "ml-auto" })}>Reabrir</button> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <FormDialog open={dialog === "account"} onOpenChange={(o) => !o && setDialog(null)} title="Nueva cuenta" description="Cuelga de una cuenta existente: 110505 cuelga de 1105." submitLabel="Crear cuenta" pendingLabel="Creando…"
        onSubmit={async (d) => { const r = await createAccountAction(slug, String(d.get("code") ?? ""), String(d.get("name") ?? "")); return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { code: r.message } }; }}
        onSuccess={({ message }) => { if (message) toast(message, "success"); router.refresh(); }}>
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Código" required error={fieldErrors.code}>{(c) => <input {...c} name="code" inputMode="numeric" autoComplete="off" className={inputClasses} placeholder="110505" />}</Field>
            <Field label="Nombre" required>{(c) => <input {...c} name="name" autoComplete="off" maxLength={120} className={inputClasses} placeholder="Caja general" />}</Field>
          </div>
        )}
      </FormDialog>

      <FormDialog open={dialog === "center"} onOpenChange={(o) => !o && setDialog(null)} title="Nuevo centro o sucursal" submitLabel="Crear" pendingLabel="Creando…"
        onSubmit={async (d) => { const r = await createCostCenterAction(slug, String(d.get("code") ?? ""), String(d.get("name") ?? ""), String(d.get("kind") ?? "CENTER")); return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { code: r.message } }; }}
        onSuccess={({ message }) => { if (message) toast(message, "success"); router.refresh(); }}>
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Código" required error={fieldErrors.code}>{(c) => <input {...c} name="code" autoComplete="off" className={inputClasses} placeholder="ADM" />}</Field>
            <Field label="Nombre" required>{(c) => <input {...c} name="name" autoComplete="off" maxLength={80} className={inputClasses} placeholder="Administración" />}</Field>
            <Field label="Tipo" required>{(c) => <Select {...c} name="kind" defaultValue="CENTER"><option value="CENTER">Centro de costo</option><option value="BRANCH">Sucursal</option></Select>}</Field>
          </div>
        )}
      </FormDialog>

      <FormDialog open={reopen !== null} onOpenChange={(o) => !o && setReopen(null)} title="Reabrir mes" description={reopen ? `${periodLabel(reopen.year, reopen.month)} volverá a admitir cambios. Queda registrado quién y por qué.` : undefined} submitLabel="Reabrir mes" pendingLabel="Reabriendo…" destructive
        onSubmit={async (d) => { if (!reopen) return { ok: false, message: "No hay mes seleccionado." }; const r = await reopenPeriodAction(slug, reopen.year, reopen.month, String(d.get("reason") ?? "")); return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { reason: r.message } }; }}
        onSuccess={({ message }) => { if (message) toast(message, "success"); router.refresh(); }}>
        {({ fieldErrors }) => <Field label="Motivo" required error={fieldErrors.reason}>{(c) => <input {...c} name="reason" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Ajuste de una factura de septiembre" />}</Field>}
      </FormDialog>
    </div>
  );
}
