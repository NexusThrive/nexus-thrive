import { ShieldCheck } from "lucide-react";
import type { AuditLogRow } from "@/lib/admin-db";
import { formatDateTime } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  CREATE_TENANT: "Negocio creado",
  SUSPEND_TENANT: "Negocio suspendido",
  ACTIVATE_TENANT: "Negocio reactivado",
  TOGGLE_MODULE: "Módulo actualizado",
  EXPORT_TENANTS: "Exportación de negocios",
  IMPERSONATE: "Acceso como negocio",
};

/**
 * Bitácora de auditoría: quién hizo qué y sobre qué negocio. Solo lectura;
 * los datos ya vienen resueltos de `lib/admin-db.ts`.
 */
export default function AuditLog({ rows }: { rows: AuditLogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        Sin acciones registradas todavía.
      </p>
    );
  }

  return (
    <ol className="divide-y">
      {rows.map((row) => (
        <li key={row.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {ACTION_LABELS[row.action] ?? row.action}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.targetTenantName ? `${row.targetTenantName} · ` : ""}
              {row.actorEmail ?? row.actorId}
            </p>
          </div>
          <time
            className="shrink-0 text-xs text-muted-foreground"
            dateTime={row.createdAt}
            title={row.createdAt}
          >
            {formatDateTime(row.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
