import { Card, CardHeader, CardTitle } from "@/components/molecules/card";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/finance";
import type {
  Customer360Metrics,
  Customer360Payment,
  CustomerTimelineEvent,
} from "@/lib/tenant-db";
import { cn } from "@/lib/utils";

/**
 * Finanzas del cliente. Separa DOS cosas que suelen confundirse:
 *  - el ÚLTIMO MOVIMIENTO (puede estar anulado o pendiente) y
 *  - el ÚLTIMO PAGO APROBADO (dinero que realmente entró).
 * También muestra el total aprobado y el ticket promedio.
 */
export default function FinanceSummary({
  metrics,
  paymentsTotal,
  lastMovement,
  lastApprovedPayment,
  className,
}: {
  metrics: Customer360Metrics;
  paymentsTotal: number;
  lastMovement: CustomerTimelineEvent | null;
  lastApprovedPayment: Customer360Payment | null;
  className?: string;
}) {
  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle>Finanzas</CardTitle>
      </CardHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-surface-muted px-3.5 py-3">
          <p className="text-xs text-muted-foreground">Total aprobado</p>
          <p className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(metrics.ltv)}
          </p>
          <p className="text-xs text-muted-foreground">
            {metrics.approvedCount}{" "}
            {metrics.approvedCount === 1 ? "aprobado" : "aprobados"} ·{" "}
            {paymentsTotal} registrados
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface-muted px-3.5 py-3">
          <p className="text-xs text-muted-foreground">Ticket promedio</p>
          <p className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(metrics.avgTicket)}
          </p>
          <p className="text-xs text-muted-foreground">
            Método favorito:{" "}
            {metrics.favoriteMethod
              ? paymentMethodLabel(metrics.favoriteMethod)
              : "sin datos"}
          </p>
        </div>
      </div>

      <dl className="grid gap-3 border-t border-border pt-4 text-[13.5px]">
        <div className="grid gap-0.5">
          <dt className="text-xs text-muted-foreground">Último movimiento</dt>
          <dd className="font-medium text-foreground">
            {lastMovement ? (
              <>
                {lastMovement.title}
                {lastMovement.status ? ` · ${lastMovement.status}` : ""}
                <span className="ml-1 font-normal text-muted-foreground">
                  {formatDateShort(lastMovement.date)}
                </span>
              </>
            ) : (
              <span className="font-normal text-muted-foreground">
                Sin movimientos
              </span>
            )}
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-xs text-muted-foreground">Último pago aprobado</dt>
          <dd className="font-medium text-foreground">
            {lastApprovedPayment ? (
              <>
                {formatCurrency(lastApprovedPayment.amount)} ·{" "}
                {paymentMethodLabel(lastApprovedPayment.provider)}
                <span className="ml-1 font-normal text-muted-foreground">
                  {formatDateShort(lastApprovedPayment.createdAt)}
                </span>
              </>
            ) : (
              <span className="font-normal text-muted-foreground">
                Sin pagos aprobados
              </span>
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
