import { CalendarDays, HandCoins, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { paymentMethodLabel, paymentStatusLabel } from "@/lib/finance";
import type { PaymentMethodValue, PaymentStatusValue } from "@/lib/finance";
import PaginationLinks from "@/app/components/tenant/pagination-links";

export type PaymentViewRow = {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  amount: number;
  provider: PaymentMethodValue;
  status: PaymentStatusValue;
  description: string | null;
  createdAt: string;
};

const STATUS_TONES: Record<PaymentStatusValue, string> = {
  APPROVED: "bg-success/10 text-success border-success/20",
  PENDING: "bg-warning text-warning-foreground border-warning-foreground/20",
  DECLINED: "bg-destructive/10 text-destructive border-destructive/20",
  VOIDED: "bg-muted text-muted-foreground border-border",
};

/**
 * Tabla de pagos (Server Component, presentación pura). Los montos ya son
 * números y las fechas ISO strings serializables desde la página.
 */
export default function PaymentsTable({
  rows,
  query,
  page,
  totalPages,
}: {
  rows: PaymentViewRow[];
  query: string;
  page: number;
  totalPages: number;
}) {
  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center shadow-xs">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <HandCoins aria-hidden="true" className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">
            {query
              ? `Sin coincidencias para «${query}»`
              : "Aún no hay pagos registrados"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {query
              ? "Prueba con otro término o limpia los filtros."
              : "Registra tu primer cobro con el botón «Registrar pago»."}
          </p>
        </div>
      ) : (
        <>
          {/* ---------- Tabla (desktop) ---------- */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-xs sm:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Pagos registrados</caption>
              <thead className="border-b border-border bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Concepto
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Método
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-muted/60">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {row.customerName ?? "Sin cliente"}
                        </p>
                        {row.customerEmail ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {row.customerEmail}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="max-w-56 px-4 py-3">
                      <p className="truncate text-muted-foreground">
                        {row.description
                          ? row.description
                          : "Pago de servicio"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {paymentMethodLabel(row.provider)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                          STATUS_TONES[row.status],
                        )}
                      >
                        {paymentStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- Tarjetas (mobile) ---------- */}
          <ul className="space-y-3 sm:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border bg-card p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                      <span className="truncate">
                        {row.customerName ?? "Sin cliente"}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                          STATUS_TONES[row.status],
                        )}
                      >
                        {paymentStatusLabel(row.status)}
                      </span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <User aria-hidden="true" className="h-3 w-3 shrink-0" />
                      {row.customerEmail ?? "Sin correo"}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-semibold text-foreground">
                    {formatCurrency(row.amount)}
                  </p>
                </div>
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  {row.description ?? "Pago de servicio"}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                  <span>{paymentMethodLabel(row.provider)}</span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays aria-hidden="true" className="h-3 w-3" />
                    {formatDateTime(row.createdAt)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <PaginationLinks
        paramKey="ppage"
        page={page}
        totalPages={totalPages}
        totalLabel="pagos"
      />
    </div>
  );
}