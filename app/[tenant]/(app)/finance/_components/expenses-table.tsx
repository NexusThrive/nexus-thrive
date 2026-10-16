import { Receipt } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import PaginationLinks from "@/components/molecules/pagination-links";

export type ExpenseViewRow = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
};

/**
 * Tabla de gastos de caja menor (Server Component, presentación pura).
 */
export default function ExpensesTable({
  rows,
  query,
  page,
  totalPages,
}: {
  rows: ExpenseViewRow[];
  query: string;
  page: number;
  totalPages: number;
}) {
  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-muted text-muted-foreground">
            <Receipt aria-hidden="true" className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">
            {query
              ? `Sin coincidencias para «${query}»`
              : "Aún no hay gastos registrados"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {query
              ? "Prueba con otro término o limpia los filtros."
              : "Registra la caja menor con el botón «Registrar gasto»."}
          </p>
        </div>
      ) : (
        <>
          {/* ---------- Tabla (desktop) ---------- */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card sm:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Gastos de caja menor</caption>
              <thead className="border-b border-border bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Concepto
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Categoría
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
                    <td className="max-w-64 px-4 py-3">
                      <p className="truncate font-medium text-foreground">
                        {row.description}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{row.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-destructive">
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
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {row.description}
                    </p>
                    <Badge
                      variant="secondary"
                      className="mt-1.5 text-[10px] uppercase"
                    >
                      {row.category}
                    </Badge>
                  </div>
                  <p className="shrink-0 text-base font-semibold text-destructive">
                    {formatCurrency(row.amount)}
                  </p>
                </div>
                <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                  {formatDate(row.date)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <PaginationLinks
        paramKey="gpage"
        page={page}
        totalPages={totalPages}
        totalLabel="gastos"
      />
    </div>
  );
}