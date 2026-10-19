import Link from "next/link";
import { Badge } from "@/components/atoms/badge";
import { ProgressBar } from "@/components/atoms/progress-bar";
import { formatCurrency } from "@/lib/format";
import { paymentMethodLabel, type PaymentMethodValue } from "@/lib/finance";

/**
 * Gastos del periodo (al lado del balance, como el artefacto): lo gastado en el
 * periodo, qué parte de los ingresos se llevó (barra oro que crece) y los
 * cobros del mes por medio de pago. Datos reales del servidor.
 */
export default function PettyCashCard({
  spent,
  income,
  periodLabel,
  byMethod,
  monthLabel,
  cash,
}: {
  spent: number;
  income: number;
  periodLabel: string;
  byMethod: { method: PaymentMethodValue; total: number }[];
  monthLabel: string;
  /** Estado de la caja menor real (turno abierto o cerrado). */
  cash?: { box: string | null; amount: number | null; href: string };
}) {
  const share = income > 0 ? Math.min(1, spent / income) : spent > 0 ? 1 : 0;
  const methods = byMethod.filter((m) => m.total > 0);
  return (
    <section className="grid content-start gap-3 rounded-lg border border-border bg-surface p-[18px]">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px] font-semibold">Gastos del periodo</h3>
        <Badge tone={share > 0.8 ? "warning" : "success"} pulse={share > 0.8}>{share > 0.8 ? "Revisar" : "Al día"}</Badge>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Gastado · {periodLabel}</p>
        <p className="font-display text-[26px] font-bold tabular-nums">{formatCurrency(spent)}</p>
      </div>
      <ProgressBar value={share} tone="gold" label="Parte de los ingresos que se fue en gastos" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{Math.round(share * 100)} % de los ingresos</span>
        <span>Ingresos {formatCurrency(income)}</span>
      </div>
      {cash ? (
        <Link href={cash.href} className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2.5 text-[13px] transition-colors hover:bg-border/60">
          <span>
            <b className="block font-medium">{cash.box ?? "Caja menor"}</b>
            <small className="text-xs text-muted-foreground">{cash.amount != null ? "Turno abierto · efectivo esperado" : cash.box ? "Cerrada · ábrela para empezar el día" : "Aún no la has creado"}</small>
          </span>
          <b className="font-mono tabular-nums">{cash.amount != null ? formatCurrency(cash.amount) : "→"}</b>
        </Link>
      ) : null}
      <div className="mt-1 border-t border-border pt-3">
        <p className="mb-2 text-xs text-muted-foreground">Cobros de {monthLabel} por medio</p>
        {methods.length ? (
          <ul className="grid gap-1.5 text-[13px]">
            {methods.map((m) => (
              <li key={m.method} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{paymentMethodLabel(m.method)}</span>
                <b className="font-medium tabular-nums">{formatCurrency(m.total)}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">Aún no hay cobros este mes.</p>
        )}
      </div>
    </section>
  );
}
