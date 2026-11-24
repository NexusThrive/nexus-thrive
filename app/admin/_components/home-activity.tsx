"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { formatDateTime } from "@/lib/foundation/format";
import { AUDIT_ACTION_LABELS } from "@/lib/platform/admin/audit-labels";
import type { ActivityItem, AuditLogRow } from "@/lib/platform/admin/db";
import { cn } from "@/lib/utils";
import { KIND_META } from "./activity-feed";
import { opsTable } from "./ops-table";

type View = "tenants" | "team";

/** Una fila ya resuelta para la tabla y la lista (las dos vistas comparten forma). */
type Line = { id: string; icon: ReactNode; title: string; tenant: string | null; tenantId: string | null; detail: string | null; at: string; atLabel: string };

const tenantLines = (items: ActivityItem[]): Line[] =>
  items.map((item) => {
    const meta = KIND_META[item.kind];
    return {
      id: item.id,
      icon: (
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", meta.className)}>
          <meta.icon aria-hidden="true" className="size-4" />
        </span>
      ),
      title: item.title,
      tenant: item.tenantName,
      tenantId: item.tenantId,
      detail: item.description,
      at: item.at,
      atLabel: item.atLabel,
    };
  });

const teamLines = (rows: AuditLogRow[]): Line[] =>
  rows.map((row) => ({
    id: row.id,
    icon: (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent-text">
        <ShieldCheck aria-hidden="true" className="size-4" />
      </span>
    ),
    title: AUDIT_ACTION_LABELS[row.action] ?? row.action,
    tenant: row.targetTenantName,
    tenantId: row.targetTenantId,
    detail: row.actorEmail ?? row.actorId,
    at: row.createdAt,
    atLabel: formatDateTime(row.createdAt),
  }));

/**
 * Actividad del Inicio en una sola tarjeta con la tabla de Clientes: los movimientos reales de los negocios y, para quien puede
 * verla, la bitácora del equipo NEXUS, que se alternan con un selector en lugar de ocupar dos columnas largas.
 */
export function HomeActivity({ activity, audit }: { activity: ActivityItem[]; /** `null`: sin permiso para ver la bitácora. */ audit: AuditLogRow[] | null }) {
  const [view, setView] = useState<View>("tenants");
  const team = view === "team" && audit != null;
  const lines = team ? teamLines(audit) : tenantLines(activity);
  const tenantCell = (line: Line) =>
    line.tenant && line.tenantId ? (
      <Link href={`/admin/negocios/${line.tenantId}`} className="truncate text-foreground outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring">
        {line.tenant}
      </Link>
    ) : (
      <span className="text-muted-foreground">{line.tenant ?? "—"}</span>
    );

  return (
    <section aria-labelledby="actividad" className="nx-rise overflow-hidden rounded-3xl border border-border bg-card">
      <header className="flex flex-wrap items-end justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p className="mb-1 font-mono text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Plataforma</p>
          <h2 id="actividad" className="font-display text-lg font-semibold tracking-[-0.02em]">
            Actividad reciente
          </h2>
        </div>
        {audit ? (
          <SegmentedControl
            size="sm"
            ariaLabel="Qué actividad ver"
            value={view}
            onChange={setView}
            options={[
              { value: "tenants", label: "Negocios" },
              { value: "team", label: "Equipo" },
            ]}
          />
        ) : null}
      </header>

      {lines.length === 0 ? (
        <p className="border-t border-border/50 px-5 py-8 text-center text-sm text-muted-foreground">{team ? "Sin acciones registradas todavía." : "Todavía no hay actividad registrada."}</p>
      ) : (
        <>
          <div className={cn(opsTable.wrap, "border-t border-border/50")}>
            <table className={opsTable.table}>
              <caption className="sr-only">{team ? "Actividad del equipo" : "Actividad de los negocios"}</caption>
              <thead className={opsTable.head}>
                <tr className={opsTable.headRow}>
                  <th scope="col" className={opsTable.th}>{team ? "Acción" : "Movimiento"}</th>
                  <th scope="col" className={opsTable.th}>Negocio</th>
                  <th scope="col" className={opsTable.th}>{team ? "Quién" : "Detalle"}</th>
                  <th scope="col" className={cn(opsTable.th, "text-right")}>Cuándo</th>
                </tr>
              </thead>
              <tbody className={opsTable.body}>
                {lines.map((line) => (
                  <tr key={line.id} className={cn(opsTable.row, "cursor-default")}>
                    <td className={opsTable.td}>
                      <span className="flex min-w-0 items-center gap-3">
                        {line.icon}
                        <span className="truncate font-medium text-foreground">{line.title}</span>
                      </span>
                    </td>
                    <td className={cn(opsTable.td, "max-w-[24ch] truncate")}>{tenantCell(line)}</td>
                    <td className={cn(opsTable.td, "max-w-[32ch] truncate text-muted-foreground")}>{line.detail ?? "—"}</td>
                    <td className={cn(opsTable.td, "whitespace-nowrap text-right tabular-nums text-muted-foreground")}>
                      <time dateTime={line.at}>{line.atLabel}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={opsTable.list}>
            {lines.map((line) => (
              <li key={line.id} className={cn(opsTable.item, "flex items-start gap-3")}>
                {line.icon}
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex items-center justify-between gap-3">
                    <b className="truncate text-sm font-medium text-foreground">{line.title}</b>
                    <time dateTime={line.at} className="shrink-0 text-xs text-muted-foreground">{line.atLabel}</time>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{[line.tenant, line.detail].filter(Boolean).join(" · ")}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
