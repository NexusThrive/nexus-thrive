"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { NLoader } from "@/components/atoms/n-loader";
import { formatDateShort, formatMoneyMicro, formatQuantityMicro } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ItemProgressRow } from "@/lib/construction/progress";
import {
  deleteProgressAction,
  recordProgressAction,
  type ProgressActionResult,
} from "../progress/actions";
import { inputClasses, labelClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";

const inputClass =
  inputClasses;

function bogotaTodayIso(): string {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Avance de obra por partida (actas). Alimenta el valor ganado del informe
 * semanal. Solo en obras contratadas.
 */
export default function ProgressPanel({
  tenantSlug,
  projectId,
  items,
  contracted,
}: {
  tenantSlug: string;
  projectId: string;
  items: ItemProgressRow[];
  contracted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ProgressActionResult | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const earned = items.reduce((sum, item) => sum + BigInt(item.earned), BigInt(0));

  const run = (action: () => Promise<ProgressActionResult>, after?: () => void) =>
    startTransition(async () => {
      const response = await action();
      setResult(response);
      if (response.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Avance de obra por partida</h2>
          <p className="text-xs text-muted-foreground">
            Valor ganado acumulado: <span className="font-medium text-foreground">{formatMoneyMicro(String(earned))}</span>{" "}
            (costo directo ejecutado).
          </p>
        </div>
      </div>

      {!contracted ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          El avance se registra cuando la obra está contratada: aprueba una cotización en la pestaña
          Cotizaciones.
        </p>
      ) : items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">El presupuesto no tiene partidas.</p>
      ) : (
        <>
          <form
            key={formKey}
            className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,2fr)_10rem_10rem_minmax(0,1fr)_auto] md:items-end"
            action={(formData) => run(() => recordProgressAction(tenantSlug, projectId, formData), () => setFormKey((k) => k + 1))}
          >
            <label htmlFor="progress-item" className="block">
              <span className={labelClasses}>Partida</span>
              <Select id="progress-item" name="budgetItemId" required defaultValue="">
                <option value="">Elige la partida…</option>
                {items.map((item) => (
                  <option key={item.itemId} value={item.itemId}>
                    {item.code} · {item.description} ({item.unit})
                  </option>
                ))}
              </Select>
            </label>
            <label htmlFor="progress-date" className="block">
              <span className={labelClasses}>Fecha de corte</span>
              <input id="progress-date" name="cutoffDate" type="date" required defaultValue={bogotaTodayIso()} max={bogotaTodayIso()} className={inputClass} />
            </label>
            <label htmlFor="progress-qty" className="block">
              <span className={labelClasses}>Cantidad ejecutada</span>
              <input id="progress-qty" name="executedQuantity" inputMode="decimal" required placeholder="12.5" className={inputClass} />
            </label>
            <label htmlFor="progress-note" className="block">
              <span className={labelClasses}>Nota (opcional)</span>
              <input id="progress-note" name="note" maxLength={300} className={inputClass} />
            </label>
            <Button type="submit" disabled={pending}>
              {pending ? <NLoader size={14} className="text-current" /> : null}
              Registrar
            </Button>
          </form>
          {result ? (
            <p
              role={result.ok ? "status" : "alert"}
              className={cn("px-4 pt-3 text-sm", result.ok ? "text-success" : "text-destructive")}
            >
              {result.message}
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-strong text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Partida</th>
                  <th className="px-3 py-2 text-right font-medium">Presupuestado</th>
                  <th className="px-3 py-2 text-right font-medium">Ejecutado</th>
                  <th className="px-3 py-2 font-medium">Avance</th>
                  <th className="px-3 py-2 text-right font-medium">Valor ganado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <ProgressRow
                    key={item.itemId}
                    item={item}
                    open={expanded === item.itemId}
                    onToggle={() => setExpanded(expanded === item.itemId ? null : item.itemId)}
                    onDelete={(entryId) => run(() => deleteProgressAction(tenantSlug, projectId, entryId))}
                    pending={pending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function ProgressRow({
  item,
  open,
  onToggle,
  onDelete,
  pending,
}: {
  item: ItemProgressRow;
  open: boolean;
  onToggle: () => void;
  onDelete: (entryId: string) => void;
  pending: boolean;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const pct = Math.min(item.pct, 100);
  return (
    <>
      <tr className="border-b border-border/60 align-top">
        <td className="px-3 py-2">
          <span className="font-mono text-xs text-muted-foreground">{item.code}</span>{" "}
          <span className="text-foreground">{item.description}</span>
          <span className="block text-xs text-muted-foreground">{item.chapterName}</span>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground">
          {formatQuantityMicro(item.quantity)} {item.unit}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-foreground">
          {formatQuantityMicro(item.executed)} {item.unit}
        </td>
        <td className="min-w-32 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className={cn("h-full rounded-full", item.pct > 100 ? "bg-gold-500" : "bg-success")} style={{ width: `${pct}%` }} />
            </div>
            <span className={cn("w-12 text-right text-xs tabular-nums", item.pct > 100 ? "text-gold-700" : "text-muted-foreground")}>
              {item.pct}%
            </span>
          </div>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-foreground">{formatMoneyMicro(item.earned)}</td>
        <td className="px-3 py-2 text-right">
          {item.entries.length > 0 ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted"
            >
              {item.entries.length} acta{item.entries.length === 1 ? "" : "s"}
              <ChevronDown aria-hidden="true" className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
            </button>
          ) : null}
        </td>
      </tr>
      {open
        ? item.entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border/40 bg-muted/40 text-xs">
              <td className="px-3 py-1.5 pl-8 text-muted-foreground" colSpan={2}>
                {formatDateShort(entry.cutoffDate)} · {entry.authorName}
                {entry.note ? ` · ${entry.note}` : ""}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-foreground">
                {formatQuantityMicro(entry.executedQuantity)} {item.unit}
              </td>
              <td colSpan={2} />
              <td className="px-3 py-1.5 text-right">
                {confirming === entry.id ? (
                  <span className="inline-flex items-center gap-1">
                    <button type="button" disabled={pending} onClick={() => onDelete(entry.id)} className="rounded px-2 py-0.5 font-medium text-destructive hover:bg-destructive/10">
                      Eliminar
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="rounded px-2 py-0.5 text-muted-foreground hover:bg-muted">
                      No
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirming(entry.id)} aria-label="Eliminar acta" className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))
        : null}
    </>
  );
}
