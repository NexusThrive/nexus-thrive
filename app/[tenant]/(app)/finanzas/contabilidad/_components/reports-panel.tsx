"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { reportAction } from "@/app/[tenant]/(app)/finanzas/contabilidad/actions";
import type { ReportResult } from "@/lib/domains/finance/accounting/reports-db";
import { formatCurrency } from "@/lib/foundation/format";
import { DateInput } from "@/components/molecules/date-input";

const LABELS = { trial: "Balance de prueba", income: "Estado de resultados", balance: "Balance general", journal: "Libro diario", ledger: "Libro mayor (una cuenta)", auxiliary: "Auxiliar por tercero (una cuenta)" } as const;
type Kind = keyof typeof LABELS;
const money = (n: number) => (n === 0 ? "" : formatCurrency(n));

/** Informes contables en pantalla y descarga en CSV para el contador. */
export default function ReportsPanel({ slug, today }: { slug: string; today: string }) {
  const [kind, setKind] = useState<Kind>("trial");
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [account, setAccount] = useState("1305");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const needsAccount = kind === "ledger" || kind === "auxiliary";
  const run = async () => {
    setPending(true);
    setError(null);
    const r = await reportAction(slug, kind, from, to, account);
    setPending(false);
    if (r.ok) setResult(r.report);
    else setError(r.message);
  };
  const csv = `/${slug}/finanzas/contabilidad/export/${kind}?desde=${from}&hasta=${to}${needsAccount ? `&cuenta=${account}` : ""}`;
  return (
    <div className="grid gap-4">
      <section aria-labelledby="rep-title" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 id="rep-title" className="font-display text-[15px] font-semibold">Informes para tu contador</h2>
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <Field label="Informe" required>{(c) => <Select {...c} value={kind} onChange={(e) => { setKind(e.target.value as Kind); setResult(null); }}>{(Object.keys(LABELS) as Kind[]).map((k) => <option key={k} value={k}>{LABELS[k]}</option>)}</Select>}</Field>
          <Field label="Desde" required>{(c) => <DateInput {...c} value={from} onChange={(e) => setFrom(e.target.value)} className={inputClasses} />}</Field>
          <Field label="Hasta" required>{(c) => <DateInput {...c} value={to} onChange={(e) => setTo(e.target.value)} className={inputClasses} />}</Field>
          {needsAccount ? <Field label="Cuenta" required>{(c) => <input {...c} inputMode="numeric" value={account} onChange={(e) => setAccount(e.target.value)} className={inputClasses} placeholder="1305" />}</Field> : null}
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={run} className={buttonVariants()}>{pending ? "Generando…" : "Ver informe"}</button>
          <a href={csv} className={buttonVariants({ variant: "outline" })}><Download aria-hidden="true" className="size-4" /> Descargar CSV</a>
        </div>
      </section>
      {result ? <Result r={result} /> : null}
    </div>
  );
}

function Result({ r }: { r: ReportResult }) {
  if (r.kind === "trial") {
    const d = r.data;
    return (
      <div className="grid gap-3">
        {d.balanced ? <p role="status" className="flex items-center gap-2 text-ui"><Badge variant="success">Cuadra</Badge> El balance de prueba cuadra: débitos y créditos son iguales.</p> : <Alert tone="danger">El balance de prueba NO cuadra: revisa el libro.</Alert>}
        {d.rows.length === 0 ? <EmptyState title="Sin movimientos" description="No hay asientos en ese rango de fechas." /> : (
          <AdaptiveTable
            caption="Balance de prueba"
            rows={d.rows}
            getRowId={(x) => x.account}
            columns={[
              { key: "account", header: "Cuenta", role: "primary", cell: (x) => <><span className="font-mono">{x.account}</span> {x.name}</> },
              { key: "debit", header: "Débitos", role: "detail", align: "right", cell: (x) => <span className="font-mono tabular-nums">{money(x.debit)}</span> },
              { key: "credit", header: "Créditos", role: "detail", align: "right", cell: (x) => <span className="font-mono tabular-nums">{money(x.credit)}</span> },
              { key: "balanceDebit", header: "Saldo débito", role: "detail", align: "right", cell: (x) => <span className="font-mono tabular-nums">{money(x.balanceDebit)}</span> },
              { key: "balanceCredit", header: "Saldo crédito", role: "detail", align: "right", cell: (x) => <span className="font-mono tabular-nums">{money(x.balanceCredit)}</span> },
            ]}
            footer={{ label: "Totales", cells: { debit: formatCurrency(d.totalDebit), credit: formatCurrency(d.totalCredit), balanceDebit: formatCurrency(d.totalBalanceDebit), balanceCredit: formatCurrency(d.totalBalanceCredit) } }}
          />
        )}
      </div>
    );
  }
  if (r.kind === "income" || r.kind === "balance") {
    const blocks = r.kind === "income"
      ? [{ n: "Ingresos", items: r.data.income, t: r.data.totalIncome }, { n: "Costos", items: r.data.cost, t: r.data.totalCost }, { n: "Gastos", items: r.data.expenses, t: r.data.totalExpenses }]
      : [{ n: "Activo", items: r.data.assets, t: r.data.totalAssets }, { n: "Pasivo", items: r.data.liabilities, t: r.data.totalLiabilities }, { n: "Patrimonio", items: r.data.equity, t: r.data.totalEquity - r.data.netResult }];
    return (
      <section aria-label={r.kind === "income" ? "Estado de resultados" : "Balance general"} className="grid gap-3 rounded-lg border border-border bg-surface p-4 text-ui">
        {blocks.map((b) => (
          <div key={b.n} className="grid gap-1">
            <h3 className="font-semibold">{b.n}</h3>
            {b.items.map((i) => <div key={i.account} className="flex justify-between"><span><span className="font-mono">{i.account}</span> {i.name}</span><span className="font-mono tabular-nums">{formatCurrency(i.amount)}</span></div>)}
            <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Total {b.n.toLowerCase()}</span><span className="font-mono tabular-nums">{formatCurrency(b.t)}</span></div>
          </div>
        ))}
        {r.kind === "income" ? (
          <div className="grid gap-1 border-t-2 border-border pt-2 font-semibold"><div className="flex justify-between"><span>Utilidad bruta</span><span className="font-mono tabular-nums">{formatCurrency(r.data.grossProfit)}</span></div><div className="flex justify-between"><span>Resultado del período</span><span className="font-mono tabular-nums">{formatCurrency(r.data.netResult)}</span></div></div>
        ) : (
          <div className="grid gap-1 border-t-2 border-border pt-2 font-semibold"><div className="flex justify-between"><span>Resultado del ejercicio</span><span className="font-mono tabular-nums">{formatCurrency(r.data.netResult)}</span></div><div className="flex items-center justify-between"><span>Activo = Pasivo + Patrimonio <Badge variant={r.data.balanced ? "success" : "destructive"}>{r.data.balanced ? "Cuadra" : "No cuadra"}</Badge></span><span className="font-mono tabular-nums">{formatCurrency(r.data.totalLiabilities + r.data.totalEquity)}</span></div></div>
        )}
      </section>
    );
  }
  if (r.kind === "journal") {
    return r.data.length === 0 ? <EmptyState title="Sin movimientos" description="No hay asientos en ese rango de fechas." /> : (
      <AdaptiveTable
        caption="Libro diario"
        rows={r.data.flatMap((g) => g.lines.map((l, i) => ({ id: `${g.number}-${i}`, g, l })))}
        getRowId={(x) => x.id}
        columns={[
          { key: "entry", header: "Asiento", role: "secondary", cell: (x) => <><b className="font-mono">N.º {x.g.number}</b> <span className="text-muted-foreground">{x.g.date} · {x.g.description}</span></> },
          { key: "account", header: "Cuenta", role: "primary", cell: (x) => <><span className="font-mono">{x.l.account}</span> {x.l.name}</> },
          { key: "debit", header: "Débito", role: "detail", align: "right", cell: (x) => <span className="font-mono tabular-nums">{money(x.l.debit)}</span> },
          { key: "credit", header: "Crédito", role: "detail", align: "right", cell: (x) => <span className="font-mono tabular-nums">{money(x.l.credit)}</span> },
        ]}
      />
    );
  }
  if (r.kind === "ledger") {
    return r.data.lines.length === 0 ? <EmptyState title="Sin movimientos" description={`La cuenta ${r.account} no tiene movimientos en ese rango.`} /> : (
      <AdaptiveTable
        caption={`Libro mayor de la cuenta ${r.account}`}
        rows={r.data.lines.map((l, i) => ({ ...l, id: String(i) }))}
        getRowId={(l) => l.id}
        columns={[
          { key: "entry", header: "Asiento", role: "primary", cell: (l) => <><span className="font-mono">N.º {l.entryNumber}</span> <span className="text-muted-foreground">{l.date}</span></> },
          { key: "description", header: "Descripción", role: "secondary", cell: (l) => l.description },
          { key: "debit", header: "Débito", role: "detail", align: "right", cell: (l) => <span className="font-mono tabular-nums">{money(l.debit)}</span> },
          { key: "credit", header: "Crédito", role: "detail", align: "right", cell: (l) => <span className="font-mono tabular-nums">{money(l.credit)}</span> },
          { key: "balance", header: "Saldo", role: "figure", cell: (l) => <span className="font-mono">{formatCurrency(l.balance)}</span> },
        ]}
      />
    );
  }
  return r.data.length === 0 ? <EmptyState title="Sin movimientos" description={`La cuenta ${r.account} no tiene movimientos en ese rango.`} /> : (
    <AdaptiveTable
      caption={`Auxiliar por tercero de la cuenta ${r.account}`}
      rows={r.data}
      getRowId={(a) => a.party}
      columns={[
        { key: "party", header: "Tercero", role: "primary", cell: (a) => <>{a.party}{a.doc ? <small className="ml-2 font-mono text-muted-foreground">{a.doc}</small> : null}</> },
        { key: "debit", header: "Débitos", role: "detail", align: "right", cell: (a) => <span className="font-mono tabular-nums">{money(a.debit)}</span> },
        { key: "credit", header: "Créditos", role: "detail", align: "right", cell: (a) => <span className="font-mono tabular-nums">{money(a.credit)}</span> },
        { key: "balance", header: "Saldo", role: "figure", cell: (a) => <span className="font-mono">{formatCurrency(a.balance)}</span> },
      ]}
    />
  );
}
