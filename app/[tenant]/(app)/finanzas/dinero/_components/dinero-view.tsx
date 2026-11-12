import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { KpiCard } from "@/components/widgets/kpi-card";
import { EmptyState } from "@/components/molecules/empty-state";
import { formatCurrency } from "@/lib/foundation/format";
import type { MoneyOverview } from "@/lib/experience/dashboard/where-is-my-money";

/** ¿Dónde está mi dinero? Una sola vista: lo cobrado por canal, lo que te deben, lo que viene en camino y lo que falta revisar. */
export default function DineroView({ slug, overview: o }: { slug: string; overview: MoneyOverview }) {
  const base = `/${slug}`;
  const empty = o.received === 0 && o.receivable.count === 0 && o.inGateway.count === 0 && o.toVerify.count === 0;
  const pending = [
    o.toVerify.count > 0 ? { key: "verify", text: `${o.toVerify.count} ${o.toVerify.count === 1 ? "transferencia por verificar" : "transferencias por verificar"} (${formatCurrency(o.toVerify.amount)})`, href: `${base}/ventas/cobros`, action: "Verificar" } : null,
    o.toReconcile.proposed > 0 ? { key: "proposed", text: `${o.toReconcile.proposed} ${o.toReconcile.proposed === 1 ? "movimiento del banco con propuesta" : "movimientos del banco con propuesta"} por confirmar`, href: `${base}/ventas/cobros`, action: "Conciliar" } : null,
    o.toReconcile.pending > 0 ? { key: "pending", text: `${o.toReconcile.pending} ${o.toReconcile.pending === 1 ? "movimiento del banco" : "movimientos del banco"} sin cruzar`, href: `${base}/ventas/cobros`, action: "Revisar" } : null,
    o.receivable.overdue > 0 ? { key: "overdue", text: `${o.receivable.overdue} ${o.receivable.overdue === 1 ? "deuda vencida" : "deudas vencidas"}`, href: `${base}/finanzas/cartera`, action: "Ver cartera" } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  if (empty) return <EmptyState mark="page" title="Aún no hay movimientos de dinero" description="Cuando cobres, vendas o registres una deuda, aquí verás dónde está cada peso." />;

  return (
    <div className="grid min-w-0 gap-5">
      <section aria-label="Resumen" className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={`Cobrado · ${o.days} días`} value={formatCurrency(o.received)} index={0} info="Pagos aprobados en el periodo, sin contar los anulados." />
        <KpiCard label="Te deben" value={formatCurrency(o.receivable.total)} hint={`${o.receivable.count} ${o.receivable.count === 1 ? "deuda" : "deudas"}`} alert={o.receivable.overdue > 0} index={1} href={`${base}/finanzas/cartera`} action={{ label: "Ver cartera" }} />
        <KpiCard label="En camino a tu banco" value={formatCurrency(o.inGateway.net)} hint={`${o.inGateway.count} ${o.inGateway.count === 1 ? "cobro" : "cobros"} de la pasarela, neto de comisión`} index={2} info="Cobros de la pasarela ya confirmados que Wompi aún no deposita (neto esperado, sin la comisión estimada)." />
        <KpiCard label="Comisiones" value={formatCurrency(o.fees.real > 0 ? o.fees.real : o.fees.estimated)} hint={o.fees.real > 0 ? "reales, según liquidaciones" : "estimadas, hasta que liquides"} index={3} />
      </section>

      {pending.length > 0 ? (
        <section aria-labelledby="dinero-pendientes" className="grid gap-2 rounded-lg border border-border bg-surface p-4">
          <h2 id="dinero-pendientes" className="flex items-center gap-2 font-display text-base font-semibold">
            <AlertTriangle aria-hidden="true" className="size-4 text-accent-text" /> Por revisar
          </h2>
          <ul className="grid gap-1.5">
            {pending.map((p) => (
              <li key={p.key} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-ui">
                <span className="min-w-0 flex-1 break-words">{p.text}</span>
                <Link href={p.href} className="inline-flex items-center gap-1 font-semibold text-accent-text hover:underline">
                  {p.action} <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="dinero-canales" className="grid gap-2 rounded-lg border border-border bg-surface p-4">
        <h2 id="dinero-canales" className="font-display text-base font-semibold">Por dónde entró · {o.days} días</h2>
        {o.byChannel.length === 0 ? (
          <p className="text-ui text-muted-foreground">No hubo cobros en este periodo.</p>
        ) : (
          <ul className="grid gap-1.5">
            {o.byChannel.map((c) => (
              <li key={c.channel} className="flex min-w-0 items-baseline gap-3 text-ui">
                <span className="min-w-0 flex-1 break-words">{c.label} <span className="text-xs text-muted-foreground">· {c.count} {c.count === 1 ? "cobro" : "cobros"}</span></span>
                <span className="font-mono font-semibold tabular-nums">{formatCurrency(c.received)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
