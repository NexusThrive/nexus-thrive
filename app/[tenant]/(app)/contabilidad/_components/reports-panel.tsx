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
import { reportAction } from "@/app/[tenant]/(app)/contabilidad/actions";
import type { ReportResult } from "@/lib/accounting/reports-db";
import { formatCurrency } from "@/lib/format";

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
  const csv = `/${slug}/contabilidad/export/${kind}?desde=${from}&hasta=${to}${needsAccount ? `&cuenta=${account}` : ""}`;
  return (
    <div className="grid gap-4">
      <section aria-labelledby="rep-title" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 id="rep-title" className="font-display text-[15px] font-semibold">Informes para tu contador</h2>
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <Field label="Informe" required>{(c) => <Select {...c} value={kind} onChange={(e) => { setKind(e.target.value as Kind); setResult(null); }}>{(Object.keys(LABELS) as Kind[]).map((k) => <option key={k} value={k}>{LABELS[k]}</option>)}</Select>}</Field>
          <Field label="Desde" required>{(c) => <input {...c} type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClasses} />}</Field>
          <Field label="Hasta" required>{(c) => <input {...c} type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClasses} />}</Field>
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

function Table({ caption, head, children }: { caption: string; head: string[]; children: React.ReactNode }) {
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-accent">
      <table className="w-full min-w-[560px] text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-muted text-left text-xs text-muted-foreground"><tr>{head.map((h, i) => <th key={h} scope="col" className={`px-3 py-2 font-medium ${i >= head.length - 2 && head.length > 3 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

function Result({ r }: { r: ReportResult }) {
  if (r.kind === "trial") {
    const d = r.data;
    return (
      <div className="grid gap-3">
        {d.balanced ? <p role="status" className="flex items-center gap-2 text-[13px]"><Badge variant="success">Cuadra</Badge> El balance de prueba cuadra: débitos y créditos son iguales.</p> : <Alert tone="danger">El balance de prueba NO cuadra: revisa el libro.</Alert>}
        {d.rows.length === 0 ? <EmptyState title="Sin movimientos" description="No hay asientos en ese rango de fechas." /> : (
          <Table caption="Balance de prueba" head={["Cuenta", "Débitos", "Créditos", "Saldo débito", "Saldo crédito"]}>
            {d.rows.map((x) => <tr key={x.account}><th scope="row" className="px-3 py-1.5 text-left font-normal"><span className="font-mono">{x.account}</span> {x.name}</th><td className="px-3 py-1.5 text-right font-mono tabular-nums">{money(x.debit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{money(x.credit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{money(x.balanceDebit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{money(x.balanceCredit)}</td></tr>)}
            <tr className="bg-surface-muted font-semibold"><th scope="row" className="px-3 py-1.5 text-left">Totales</th><td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatCurrency(d.totalDebit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatCurrency(d.totalCredit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatCurrency(d.totalBalanceDebit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatCurrency(d.totalBalanceCredit)}</td></tr>
          </Table>
        )}
      </div>
    );
  }
  if (r.kind === "income" || r.kind === "balance") {
    const blocks = r.kind === "income"
      ? [{ n: "Ingresos", items: r.data.income, t: r.data.totalIncome }, { n: "Costos", items: r.data.cost, t: r.data.totalCost }, { n: "Gastos", items: r.data.expenses, t: r.data.totalExpenses }]
      : [{ n: "Activo", items: r.data.assets, t: r.data.totalAssets }, { n: "Pasivo", items: r.data.liabilities, t: r.data.totalLiabilities }, { n: "Patrimonio", items: r.data.equity, t: r.data.totalEquity - r.data.netResult }];
    return (
      <section aria-label={r.kind === "income" ? "Estado de resultados" : "Balance general"} className="grid gap-3 rounded-lg border border-border bg-surface p-4 text-[13.5px]">
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
      <Table caption="Libro diario" head={["Asiento", "Cuenta", "Débito", "Crédito"]}>
        {r.data.flatMap((g) => g.lines.map((l, i) => <tr key={`${g.number}-${i}`}><th scope="row" className="px-3 py-1.5 text-left font-normal">{i === 0 ? <><b className="font-mono">N.º {g.number}</b> <span className="text-muted-foreground">{g.date} · {g.description}</span></> : null}</th><td className="px-3 py-1.5"><span className="font-mono">{l.account}</span> {l.name}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{money(l.debit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{money(l.credit)}</td></tr>))}
      </Table>
    );
  }
  if (r.kind === "ledger") {
    return r.data.lines.length === 0 ? <EmptyState title="Sin movimientos" description={`La cuenta ${r.account} no tiene movimientos en ese rango.`} /> : (
      <Table caption={`Libro mayor de la cuenta ${r.account}`} head={["Asiento", "Descripción", "Débito", "Crédito", "Saldo"]}>
        {r.data.lines.map((l, i) => <tr key={i}><th scope="row" className="px-3 py-1.5 text-left font-normal"><span className="font-mono">N.º {l.entryNumber}</span> <span className="text-muted-foreground">{l.date}</span></th><td className="px-3 py-1.5">{l.description}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{money(l.debit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{money(l.credit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatCurrency(l.balance)}</td></tr>)}
      </Table>
    );
  }
  return r.data.length === 0 ? <EmptyState title="Sin movimientos" description={`La cuenta ${r.account} no tiene movimientos en ese rango.`} /> : (
    <Table caption={`Auxiliar por tercero de la cuenta ${r.account}`} head={["Tercero", "Débitos", "Créditos", "Saldo"]}>
      {r.data.map((a) => <tr key={a.party}><th scope="row" className="px-3 py-1.5 text-left font-normal">{a.party}{a.doc ? <small className="ml-2 font-mono text-muted-foreground">{a.doc}</small> : null}</th><td className="px-3 py-1.5 text-right font-mono tabular-nums">{money(a.debit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{money(a.credit)}</td><td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatCurrency(a.balance)}</td></tr>)}
    </Table>
  );
}
