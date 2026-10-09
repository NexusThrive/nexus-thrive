"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { formatCurrency, toNumber } from "@/lib/format";
import type { ApuActivityRow } from "@/lib/tenant-db";
import { createQuoteAction, type QuoteFormState } from "../actions";

const INITIAL_QUOTE_STATE: QuoteFormState = { status: "idle" };

const AIU_DEFAULTS = {
  adminPercent: "15",
  imprevPercent: "5",
  utilPercent: "10",
  taxPercent: "19",
} as const;

type Line = { activityId: string; quantity: string };

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-border-strong focus:border-accent focus:outline-2 focus:outline-accent/30";

function fieldError(
  errors?: {
    [key: string]: string;
  },
  field?: string,
) {
  return errors?.[field ?? ""];
}

/**
 * Cotizador interactivo de presupuestos de obra.
 *
 * IMPORTANTE: los totales que ves aquí son una PREVISUALIZACIÓN hecha con
 * `number` en el navegador (pueden variar en centavos). Al guardar, el
 * servidor recalcula TODO con aritmética decimal exacta (`apu-engine`) y
 * congela el snapshot de cada APU. Nunca se confía en estos números.
 */
export default function QuoteBuilder({
  tenantSlug,
  customers,
  activities,
  quoteLabel,
  customerLabel,
}: {
  tenantSlug: string;
  customers: { id: string; name: string }[];
  activities: ApuActivityRow[];
  quoteLabel: string;
  customerLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createQuoteAction,
    INITIAL_QUOTE_STATE,
  );
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [picker, setPicker] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [aiu, setAiu] = useState({ ...AIU_DEFAULTS });

  useEffect(() => {
    if (state.status === "ok") {
      router.push(`/${tenantSlug}/quotes`);
    }
  }, [state, router, tenantSlug]);

  const activityById = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity])),
    [activities],
  );

  const addLine = () => {
    if (!picker) {
      return;
    }
    if (lines.some((line) => line.activityId === picker)) {
      setDuplicateWarning(true);
      window.setTimeout(() => setDuplicateWarning(false), 2500);
      return;
    }
    setLines([...lines, { activityId: picker, quantity: "1" }]);
    setPicker("");
  };

  const setQuantity = (index: number, quantity: string) => {
    setLines(
      lines.map((line, i) => (i === index ? { ...line, quantity } : line)),
    );
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  /** PREVISUALIZACIÓN (uso `number`): el servidor recalcula al guardar. */
  const preview = useMemo(() => {
    const rows = lines.map((line) => {
      const activity = activityById.get(line.activityId);
      const unitCost = activity ? toNumber(activity.unitCost) : 0;
      const quantity = toNumber(line.quantity.replace(",", "."));
      return { name: activity?.name ?? "—", unit: activity?.unit ?? "", unitCost, quantity, total: quantity * unitCost };
    });
    const direct = rows.reduce((sum, row) => sum + row.total, 0);
    const admin = (direct * toNumber(aiu.adminPercent)) / 100;
    const contingency = (direct * toNumber(aiu.imprevPercent)) / 100;
    const utility = (direct * toNumber(aiu.utilPercent)) / 100;
    const subtotal = direct + admin + contingency + utility;
    const tax = (utility * toNumber(aiu.taxPercent)) / 100;
    return { rows, direct, admin, contingency, utility, subtotal, tax, total: subtotal + tax };
  }, [lines, activityById, aiu]);

  const setAiuField = (key: keyof typeof AIU_DEFAULTS, value: string) => {
    setAiu((prev) => ({ ...prev, [key]: value }));
  };

  const aiuError = (field: string) =>
    Boolean(fieldError(state.errors, field));

  const itemsJson = JSON.stringify(
    lines.map((line) => ({ activityId: line.activityId, quantity: line.quantity })),
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="itemsJson" value={itemsJson} />
      <input type="hidden" name="adminPercent" value={aiu.adminPercent} />
      <input type="hidden" name="imprevPercent" value={aiu.imprevPercent} />
      <input type="hidden" name="utilPercent" value={aiu.utilPercent} />
      <input type="hidden" name="taxPercent" value={aiu.taxPercent} />

      {state.status === "error" && state.message ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Columna izquierda: datos + actividades */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-foreground/80">
                Nombre del {quoteLabel.toLowerCase()}
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={`Ej: ${quoteLabel} obra casa El Nogal`}
                aria-invalid={Boolean(fieldError(state.errors, "title"))}
                className={inputClass}
              />
              {fieldError(state.errors, "title") ? (
                <span className="mt-1 block text-xs text-destructive">
                  {fieldError(state.errors, "title")}
                </span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-foreground/80">
                {customerLabel} (opcional)
              </span>
              <select
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className={inputClass}
              >
                <option value="">Sin {customerLabel.toLowerCase()}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Actividades del {quoteLabel.toLowerCase()}
              </h2>
              <span className="text-xs text-muted-foreground">
                Precios del catálogo APU
              </span>
            </div>

            <div className="mb-3 flex gap-2">
              <select
                value={picker}
                onChange={(event) => setPicker(event.target.value)}
                aria-label="Seleccionar actividad"
                className={inputClass}
              >
                <option value="">Selecciona una actividad…</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name} · {formatCurrency(activity.unitCost)} /{" "}
                    {activity.unit}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addLine}
                disabled={!picker}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Agregar
              </button>
            </div>
            {duplicateWarning ? (
              <p className="mb-2 text-xs font-medium text-gold-700">
                Esa actividad ya está en el {quoteLabel.toLowerCase()}. Ajusta
                su cantidad.
              </p>
            ) : null}

            {preview.rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                Agrega actividades desde el catálogo APU para calcular el{" "}
                {quoteLabel.toLowerCase()}.
              </p>
            ) : (
              <div className="space-y-2">
                {preview.rows.map((row, index) => (
                  <div
                    key={lines[index].activityId}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/60 p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(row.unitCost)} / {row.unit}
                      </p>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      Cant.
                      <input
                        value={lines[index].quantity}
                        onChange={(event) =>
                          setQuantity(index, event.target.value)
                        }
                        inputMode="decimal"
                        aria-label={`Cantidad de ${row.name}`}
                        className="h-9 w-20 rounded-lg border border-border bg-card px-2 text-sm text-foreground focus:border-accent focus:outline-2 focus:outline-accent/30"
                      />
                    </label>
                    <p className="w-28 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(row.total)}
                    </p>
                    <button
                      type="button"
                      aria-label={`Quitar ${row.name}`}
                      onClick={() => removeLine(index)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {fieldError(state.errors, "items") ? (
              <span className="mt-2 block text-xs text-destructive">
                {fieldError(state.errors, "items")}
              </span>
            ) : null}
          </div>
        </div>

        {/* Columna derecha: AIU + resumen financiero */}
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Calculator aria-hidden="true" className="h-4 w-4 text-accent-text" />
              AIU (%)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["adminPercent", "Administración"],
                  ["imprevPercent", "Imprevistos"],
                  ["utilPercent", "Utilidad"],
                  ["taxPercent", "IVA s/ utilidad"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    {label}
                  </span>
                  <input
                    value={aiu[key]}
                    onChange={(event) => setAiuField(key, event.target.value)}
                    inputMode="decimal"
                    aria-invalid={aiuError(key)}
                    className={inputClass}
                  />
                  {aiuError(key) ? (
                    <span className="mt-1 block text-xs text-destructive">
                      {fieldError(state.errors, key)}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Resumen financiero
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Costo directo</dt>
                <dd className="font-medium text-foreground">
                  {formatCurrency(preview.direct)}
                </dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Administración ({aiu.adminPercent}%)</dt>
                <dd>{formatCurrency(preview.admin)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Imprevistos ({aiu.imprevPercent}%)</dt>
                <dd>{formatCurrency(preview.contingency)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Utilidad ({aiu.utilPercent}%)</dt>
                <dd>{formatCurrency(preview.utility)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="font-medium text-foreground">
                  {formatCurrency(preview.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>IVA ({aiu.taxPercent}% sobre utilidad)</dt>
                <dd>{formatCurrency(preview.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                <dt>Total</dt>
                <dd>{formatCurrency(preview.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
              Previsualización estimada. Al guardar, el servidor recalcula
              con precisión decimal exacta y congela el APU de cada actividad.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending || lines.length === 0}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? "Guardando…"
              : `Crear ${quoteLabel.toLowerCase()} como borrador`}
          </button>
        </aside>
      </div>
    </form>
  );
}