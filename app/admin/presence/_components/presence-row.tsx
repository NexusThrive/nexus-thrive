"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { Badge, StatusDot } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ProgressBar } from "@/components/atoms/progress-bar";
import { cn } from "@/lib/utils";
import { PRESENCE_STATES } from "@/lib/presence/presence";
import type { PresenceOverviewRow } from "@/lib/ops/presence";
import { rescanPresenceAction } from "../actions";

const STATE_LABEL: Record<string, string> = {
  INVISIBLE: "Invisible",
  VISIBLE: "Visible",
  CONECTADO: "Conectado",
  DOMINANTE: "Dominante",
};

export default function PresenceRow({ row }: { row: PresenceOverviewRow }) {
  const [pending, startTransition] = useTransition();
  const meta = PRESENCE_STATES[row.state];

  const rescan = () => {
    startTransition(async () => {
      await rescanPresenceAction(row.id);
    });
  };

  return (
    <li className="min-w-0 rounded-lg border border-border bg-surface">
      <details className="group">
        <summary className="flex min-w-0 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="grid size-11 shrink-0 place-items-center rounded-md border border-border font-display text-[16px] font-bold tabular-nums">
            {row.score}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{row.name}</span>
            <small className="block truncate text-xs text-muted-foreground">
              {row.siteUrl ?? "Sin sitio"} · nivel {STATE_LABEL[row.state]}
            </small>
          </span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </summary>

        <div className="grid gap-3 border-t border-border px-4 py-3">
          <ProgressBar value={row.score / 100} tone={meta.bar} className="h-2" label="Presencia" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {row.checks.map((check) => (
              <li key={check.key} className="flex items-center gap-2 text-[12.5px]">
                <StatusDot tone={check.done ? "success" : "muted"} />
                <span className={cn("truncate", check.done ? "text-foreground" : "text-muted-foreground")}>{check.label}</span>
                <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                  {check.earned}/{check.weight}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <button type="button" onClick={rescan} disabled={pending} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <RefreshCw className={cn("size-3.5", pending && "animate-spin")} aria-hidden="true" />
              {pending ? "Analizando…" : "Reanalizar"}
            </button>
            {row.siteUrl ? (
              <a href={row.siteUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent-text">
                Abrir sitio →
              </a>
            ) : null}
          </div>
        </div>
      </details>
    </li>
  );
}
