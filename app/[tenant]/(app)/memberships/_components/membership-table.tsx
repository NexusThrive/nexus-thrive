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
import { cn } from "@/lib/utils";
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
            : "Asigna una membresía desde la ficha del cliente."}
        </p>
      </div>
    );
  }

  return (
    <>
      <AdaptiveTable
        caption="Membresías"
        actionsBelow
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
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {canSell ? (
                  <RowAction label={`Renovar membresía de ${row.customerName}`} text="Renovar" primary onClick={() => setRenewTarget(row)}>
                    <RefreshCw aria-hidden="true" className="size-4" />
                  </RowAction>
                ) : null}
                <RowAction label={`Recordatorio de vencimiento para ${row.customerName}`} text="Avisar" onClick={() => setReminderTarget(row)}>
                  <MessageCircle aria-hidden="true" className="size-4" />
                </RowAction>
                <RowAction label={`Congelar o cancelar la membresía de ${row.customerName}`} text="Pausar" onClick={() => setHoldTarget(row)}>
                  <PauseCircle aria-hidden="true" className="size-4" />
                </RowAction>
                <Link
                  href={`/${tenantSlug}/crm?q=${encodeURIComponent(row.customerName)}`}
                  aria-label={`Ver a ${row.customerName} en el CRM`}
                  className={rowActionClass(false)}
                >
                  <UserRound aria-hidden="true" className="size-4" />
                  <span>Ficha</span>
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

/** Botón de fila con texto y borde: visible y fácil de tocar en la lista y en la tabla. */
function rowActionClass(primary: boolean) {
  return cn(
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-11",
    primary ? "border-accent bg-accent text-accent-foreground hover:opacity-90" : "border-border bg-card text-foreground hover:bg-surface-muted",
  );
}

function RowAction({
  label,
  text,
  primary = false,
  onClick,
  children,
}: {
  label: string;
  text: string;
  primary?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={rowActionClass(primary)}>
      {children}
      <span>{text}</span>
    </button>
  );
}
