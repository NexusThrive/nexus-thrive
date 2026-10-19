"use client";

import { useActionState } from "react";

import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Input, labelClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Textarea } from "@/components/atoms/textarea";
import type { PresenceRequestRow } from "@/lib/ops/presence";
import { updatePresenceRequestAction, type PresenceAdminState } from "../actions";

const IDLE: PresenceAdminState = { status: "idle" };

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendiente" },
  { value: "DESIGN", label: "En diseño" },
  { value: "REVIEW", label: "En revisión" },
  { value: "PUBLISHED", label: "Publicada" },
  { value: "CANCELLED", label: "Cancelada" },
] as const;

const STATUS_LABEL = new Map<string, string>(STATUS_OPTIONS.map((option) => [option.value, option.label]));

const STATUS_TONE: Record<string, "neutral" | "warning" | "success" | "danger" | "muted"> = {
  PENDING: "warning",
  DESIGN: "neutral",
  REVIEW: "neutral",
  PUBLISHED: "success",
  CANCELLED: "muted",
};

function formatCop(value: number | null): string {
  if (value === null) return "Sin precio";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

function RequestItem({ row }: { row: PresenceRequestRow }) {
  const [state, action, pending] = useActionState(updatePresenceRequestAction, IDLE);
  return (
    <li className="min-w-0 rounded-lg border border-border bg-surface">
      <details className="group">
        <summary className="flex min-w-0 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{row.businessName}</span>
            <small className="block truncate text-xs text-muted-foreground">
              {row.tenantName} · {row.contactName} · {row.contactPhone}
              {row.domain ? ` · ${row.domain}` : ""}
            </small>
          </span>
          <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">{formatCop(row.priceCop)}</span>
          <Badge tone={STATUS_TONE[row.status] ?? "neutral"}>
            {STATUS_LABEL.get(row.status) ?? row.status}
          </Badge>
        </summary>

        <form action={action} className="grid gap-3 border-t border-border px-4 py-3 sm:grid-cols-2">
          <input type="hidden" name="requestId" value={row.id} />
          <div>
            <label className={labelClasses} htmlFor={`status-${row.id}`}>
              Estado
            </label>
            <Select id={`status-${row.id}`} name="status" defaultValue={row.status}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className={labelClasses} htmlFor={`url-${row.id}`}>
              URL publicada
            </label>
            <Input
              id={`url-${row.id}`}
              name="publishedUrl"
              type="url"
              placeholder="https://negocio.nexusthrive.com"
              defaultValue={row.publishedUrl ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClasses} htmlFor={`notes-${row.id}`}>
              Notas internas
            </label>
            <Textarea id={`notes-${row.id}`} name="staffNotes" rows={2} placeholder="Diseñador, avances, pendientes…" />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="submit" disabled={pending} className={buttonVariants({ variant: "accent", size: "sm" })}>
              {pending ? "Guardando…" : "Guardar solicitud"}
            </button>
            {state.status !== "idle" && state.message ? (
              <p className={state.status === "ok" ? "text-xs text-success" : "text-xs text-danger"}>{state.message}</p>
            ) : null}
          </div>
        </form>
      </details>
    </li>
  );
}

export default function RequestList({ rows }: { rows: PresenceRequestRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-strong bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
        Aún no hay solicitudes de sitio.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
      {rows.map((row) => (
        <RequestItem key={row.id} row={row} />
      ))}
    </ul>
  );
}
