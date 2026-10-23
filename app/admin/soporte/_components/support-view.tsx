"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { EmptyState } from "@/components/molecules/empty-state";
import { KpiCard } from "@/components/molecules/kpi-card";
import { SearchField } from "@/components/molecules/search-field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useMinute } from "@/lib/hooks/use-minute";
import { isOpenStatus, priorityMeta, slaState, statusMeta } from "@/lib/ops/support-rules";
import type { TicketRow } from "@/lib/ops/tickets";
import { cn } from "@/lib/utils";
import SlaBadge from "./sla-badge";
import TicketSheet, { type Option } from "./ticket-sheet";

type View = "open" | "waiting" | "done" | "all";

const PRIORITY_DOT = { LOW: "bg-muted-foreground/40", NORMAL: "bg-foreground/60", HIGH: "bg-accent", URGENT: "bg-danger" } as const;

/** Bandeja de tickets: abiertos primero, ordenados por urgencia del SLA. */
export default function SupportView({ tickets, tenants, staff, me, canReply }: { tickets: TicketRow[]; tenants: Option[]; staff: Option[]; me: string; canReply: boolean }) {
  const params = useSearchParams();
  const now = useMinute();
  const [creating, setCreating] = useState(params.get("nuevo") === "1");
  const [view, setView] = useState<View>("open");
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState("");

  const open = tickets.filter((t) => isOpenStatus(t.status));
  const breached = open.filter((t) => slaState(t, now).state === "breached").length;
  const unassigned = open.filter((t) => !t.assigneeId).length;
  const resolved = tickets.filter((t) => t.resolvedAt && t.firstResponseAt);
  const avgFirstH = resolved.length ? resolved.reduce((s, t) => s + (t.firstResponseAt! - t.createdAt), 0) / resolved.length / 3_600_000 : null;

  const text = q.trim().toLowerCase();
  const rows = tickets
      .filter((t) => (view === "open" ? isOpenStatus(t.status) && t.status !== "WAITING_CUSTOMER" : view === "waiting" ? t.status === "WAITING_CUSTOMER" : view === "done" ? !isOpenStatus(t.status) : true))
      .filter((t) => !mine || t.assigneeId === me)
      .filter((t) => !text || [t.code, t.subject, t.tenantName, t.requesterName].some((x) => x?.toLowerCase().includes(text)))
      .sort((a, b) => {
        if (view !== "open") return b.createdAt - a.createdAt;
        const da = slaState(a, now).dueAt ?? Infinity;
        const dbb = slaState(b, now).dueAt ?? Infinity;
        return da - dbb;
      });

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard label="Tickets abiertos" value={open.length} index={0} />
        <KpiCard label="SLA vencido" value={breached} alert={breached > 0} index={1} />
        <KpiCard label="Sin asignar" value={unassigned} alert={unassigned > 0} index={2} />
        <KpiCard label="Primera respuesta" value={avgFirstH == null ? "—" : `${avgFirstH.toFixed(1)} h`} hint="Promedio en resueltos" index={3} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="overflow-x-auto [scrollbar-width:none]">
          <SegmentedControl
            ariaLabel="Vista"
            value={view}
            onChange={setView}
            options={[
              { value: "open", label: "Abiertos", count: open.filter((t) => t.status !== "WAITING_CUSTOMER").length },
              { value: "waiting", label: "Esperando", count: open.filter((t) => t.status === "WAITING_CUSTOMER").length },
              { value: "done", label: "Resueltos" },
              { value: "all", label: "Todos" },
            ]}
          />
        </div>
        <ChipRow>
          <Chip selected={mine} onClick={() => setMine(!mine)}>
            Asignados a mí
          </Chip>
        </ChipRow>
        <SearchField aria-label="Buscar tickets" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código, asunto o negocio" containerClassName="order-last basis-full sm:order-none sm:basis-auto sm:max-w-xs" />
        {canReply ? (
          <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "ml-auto" })}>
            <Plus aria-hidden="true" className="size-4" /> Nuevo ticket
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState title={view === "open" ? "Sin tickets abiertos" : "Nada por aquí"} description="Los casos que llegan por WhatsApp, correo o llamada se registran como ticket." />
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {rows.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/soporte/${t.id}`} className="grid gap-1.5 px-4 py-3 transition-colors hover:bg-surface-muted md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
                <span className="grid min-w-0 gap-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-label={`Prioridad ${priorityMeta(t.priority).label}`} className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT[t.priority])} />
                    <span className="font-mono text-[11.5px] text-muted-foreground">{t.code}</span>
                    <b className="truncate text-[14px] font-medium">{t.subject}</b>
                  </span>
                  <small className="truncate text-xs text-muted-foreground">
                    {t.tenantName ?? "Sin negocio"} · {t.category} · {t.channel} · {t.assigneeName ?? <span className="text-danger">sin asignar</span>}
                  </small>
                </span>
                <span className="flex flex-wrap items-center gap-1.5 md:justify-end">
                  <Badge tone={statusMeta(t.status).tone}>{statusMeta(t.status).label}</Badge>
                  <SlaBadge t={t} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating ? <TicketSheet open onOpenChange={setCreating} tenants={tenants} staff={staff} me={me} defaultTenantId={params.get("negocio") ?? undefined} /> : null}
    </div>
  );
}
