import type { Customer360Payment } from "@/lib/tenant-db";
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
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Este cliente todavía no tiene pagos registrados.
      </div>
    );
  }

  const truncated = total > payments.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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
          <tbody className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatDateTime(payment.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                  {formatCurrency(payment.amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {paymentMethodLabel(payment.provider)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <PaymentStatusPill status={payment.status} />
                </td>
                <td className="max-w-[10rem] truncate px-4 py-3 text-slate-500">
                  {payment.providerRefId || (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="max-w-[16rem] truncate px-4 py-3 text-slate-500">
                  {payment.description || (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated ? (
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          Mostrando los {payments.length} pagos más recientes de {total}.
        </p>
      ) : null}
    </div>
  );
}