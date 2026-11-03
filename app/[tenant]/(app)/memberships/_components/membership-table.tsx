"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, PauseCircle, RefreshCw, UserRound } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import MembershipHoldSheet from "./membership-hold-sheet";
import PaginationLinks from "@/components/molecules/pagination-links";
import { formatCurrency, formatDateShort } from "@/lib/foundation/format";
import { typeLabel, type MembershipStatusValue, type MembershipTypeValue } from "@/lib/industry/gym/memberships";
import MembershipStatusBadge from "./membership-status-badge";
import MembershipModal from "./membership-modal";
import WhatsAppReminder from "./whatsapp-reminder";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";

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
  hold: "frozen" | "cancelled" | null;
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
  canSell = true,
}: {
  tenantSlug: string;
  rows: MembershipViewRow[];
  query: string;
  page: number;
  totalPages: number;
  /** El rol maneja dinero: renovar es cobrar (el servidor lo vuelve a exigir). */
  canSell?: boolean;
}) {
  const [renewTarget, setRenewTarget] = useState<MembershipViewRow | null>(null);
  const [reminderTarget, setReminderTarget] = useState<MembershipViewRow | null>(
    null,
  );
  const [holdTarget, setHoldTarget] = useState<MembershipViewRow | null>(null);
  const badge = (row: MembershipViewRow) =>
    row.hold ? <Badge tone={row.hold === "frozen" ? "neutral" : "muted"}>{row.hold === "frozen" ? "Congelada" : "Cancelada"}</Badge> : <MembershipStatusBadge status={row.status} />;

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
      <AdaptiveTable
        caption="Membresías"
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: "customer", header: "Cliente", role: "primary", cell: (r) => r.customerName },
          { key: "contact", header: "Contacto", role: "secondary", cell: (r) => r.customerPhone ?? r.customerEmail ?? "Sin contacto" },
          { key: "plan", header: "Plan", role: "detail", cell: (r) => typeLabel(r.type) },
          { key: "term", header: "Vigencia", role: "detail", cell: (r) => <>{formatDateShort(r.startDate)} → {formatDateShort(r.endDate)}</> },
          { key: "price", header: "Precio", role: "figure", cell: (r) => <span className="font-medium">{formatCurrency(r.price)}</span> },
          { key: "status", header: "Estado", role: "status", cell: (r) => badge(r) },
          {
            key: "actions",
            header: "Acciones",
            role: "action",
            cell: (row) => (
              <div className="flex items-center justify-end gap-1">
                {canSell ? (
                  <RowAction label={`Renovar membresía de ${row.customerName}`} onClick={() => setRenewTarget(row)}>
                    <RefreshCw aria-hidden="true" className="h-4 w-4" />
                  </RowAction>
                ) : null}
                <RowAction label={`Recordatorio de vencimiento para ${row.customerName}`} onClick={() => setReminderTarget(row)}>
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                </RowAction>
                <RowAction label={`Congelar o cancelar la membresía de ${row.customerName}`} onClick={() => setHoldTarget(row)}>
                  <PauseCircle aria-hidden="true" className="h-4 w-4" />
                </RowAction>
                <Link
                  href={`/${tenantSlug}/crm?q=${encodeURIComponent(row.customerName)}`}
                  aria-label={`Ver a ${row.customerName} en el CRM`}
                  className="grid h-8 w-8 pointer-coarse:size-11 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <UserRound aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            ),
          },
        ]}
      />

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
      {holdTarget ? (
        <MembershipHoldSheet
          tenantSlug={tenantSlug}
          membership={holdTarget}
          onClose={() => setHoldTarget(null)}
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
      className="grid h-8 w-8 pointer-coarse:size-11 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
