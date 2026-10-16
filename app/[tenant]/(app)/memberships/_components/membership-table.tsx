"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, RefreshCw, UserRound } from "lucide-react";
import PaginationLinks from "@/components/molecules/pagination-links";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { typeLabel, type MembershipStatusValue, type MembershipTypeValue } from "@/lib/memberships";
import MembershipStatusBadge from "./membership-status-badge";
import MembershipModal from "./membership-modal";
import WhatsAppReminder from "./whatsapp-reminder";
import { buttonVariants } from "@/components/atoms/button-variants";

export type MembershipViewRow = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  type: MembershipTypeValue;
  status: MembershipStatusValue;
  price: number;
  startDate: string;
  endDate: string;
};

/**
 * Listado de membresías (Client Component): tabla en desktop y tarjetas en
 * mobile. Las acciones (renovar / recordatorio WhatsApp / ver cliente) se
 * ejecutan aquí; los datos se refrescan por `revalidatePath` de los server
 * actions.
 */
export default function MembershipTable({
  tenantSlug,
  rows,
  query,
  page,
  totalPages,
}: {
  tenantSlug: string;
  rows: MembershipViewRow[];
  query: string;
  page: number;
  totalPages: number;
}) {
  const [renewTarget, setRenewTarget] = useState<MembershipViewRow | null>(null);
  const [reminderTarget, setReminderTarget] = useState<MembershipViewRow | null>(
    null,
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center">
        <p className="text-sm font-medium text-foreground/80">
          No hay membresías{query ? " que coincidan con la búsqueda" : ""}.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {query
            ? "Prueba con otro término o limpia los filtros."
            : "Crea la primera membresía con el botón “Nueva membresía”."}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Cliente
              </th>
              <th scope="col" className="px-4 py-3">
                Plan
              </th>
              <th scope="col" className="px-4 py-3">
                Vigencia
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Precio
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-muted/60">
                <td className="max-w-[14rem] px-4 py-3">
                  <p className="truncate font-medium text-foreground">
                    {row.customerName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.customerPhone ?? row.customerEmail ?? "Sin contacto"}
                  </p>
                </td>
                <td className="px-4 py-3 text-foreground/80">
                  {typeLabel(row.type)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground/80">
                  {formatDateShort(row.startDate)} → {formatDateShort(row.endDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">
                  {formatCurrency(row.price)}
                </td>
                <td className="px-4 py-3">
                  <MembershipStatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <RowAction
                      label={`Renovar membresía de ${row.customerName}`}
                      onClick={() => setRenewTarget(row)}
                    >
                      <RefreshCw aria-hidden="true" className="h-4 w-4" />
                    </RowAction>
                    <RowAction
                      label={`Recordatorio de vencimiento para ${row.customerName}`}
                      onClick={() => setReminderTarget(row)}
                    >
                      <MessageCircle aria-hidden="true" className="h-4 w-4" />
                    </RowAction>
                    <Link
                      href={`/${tenantSlug}/crm?q=${encodeURIComponent(row.customerName)}`}
                      aria-label={`Ver a ${row.customerName} en el CRM`}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <UserRound aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {row.customerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {typeLabel(row.type)} · {formatCurrency(row.price)}
                </p>
              </div>
              <MembershipStatusBadge status={row.status} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDateShort(row.startDate)} → {formatDateShort(row.endDate)}
            </p>
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setRenewTarget(row)}
                className={buttonVariants({ size: "sm" })}
              >
                <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                Renovar
              </button>
              <button
                type="button"
                onClick={() => setReminderTarget(row)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />
                Recordatorio
              </button>
              <Link
                href={`/${tenantSlug}/crm?q=${encodeURIComponent(row.customerName)}`}
                aria-label={`Ver a ${row.customerName} en el CRM`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
                Cliente
              </Link>
            </div>
          </article>
        ))}
      </div>

      <PaginationLinks
        paramKey="page"
        page={page}
        totalPages={totalPages}
        totalLabel={
          query ? "resultados de la búsqueda" : "membresías registradas"
        }
      />

      {renewTarget ? (
        <MembershipModal
          tenantSlug={tenantSlug}
          membership={renewTarget}
          onClose={() => setRenewTarget(null)}
        />
      ) : null}
      {reminderTarget ? (
        <WhatsAppReminder
          membership={reminderTarget}
          onClose={() => setReminderTarget(null)}
        />
      ) : null}
    </>
  );
}

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
