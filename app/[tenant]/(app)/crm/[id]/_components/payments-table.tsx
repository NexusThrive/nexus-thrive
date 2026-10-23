import type { Customer360Payment } from "@/lib/tenant/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/finance";
import { PaymentStatusPill } from "./status-pills";

/** Pestaña Pagos: historial limitado a los más recientes (acotado). */
export default function PaymentsTable({
  payments,
  total,
}: {
  payments: Customer360Payment[];
  total: number;
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Este cliente todavía no tiene pagos registrados.
      </div>
    );
  }

  const truncated = total > payments.length;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted text-left text-xs font-semibold text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Fecha
              </th>
              <th scope="col" className="px-4 py-3">
                Monto
              </th>
              <th scope="col" className="px-4 py-3">
                Método
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
              <th scope="col" className="px-4 py-3">
                Referencia
              </th>
              <th scope="col" className="px-4 py-3">
                Descripción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-muted">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDateTime(payment.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">
                  {formatCurrency(payment.amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {paymentMethodLabel(payment.provider)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <PaymentStatusPill status={payment.status} />
                </td>
                <td className="max-w-[10rem] truncate px-4 py-3 text-muted-foreground">
                  {payment.providerRefId || (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="max-w-[16rem] truncate px-4 py-3 text-muted-foreground">
                  {payment.description || (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated ? (
        <p className="border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
          Mostrando los {payments.length} pagos más recientes de {total}.
        </p>
      ) : null}
    </div>
  );
}
