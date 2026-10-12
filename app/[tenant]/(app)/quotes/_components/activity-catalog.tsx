"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Layers, Pencil, Plus, X, AlertTriangle } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import { formatCurrency } from "@/lib/format";
import { APU_UNITS, formatApuUnit } from "@/lib/apu-engine";
import SearchInput from "@/app/components/tenant/search-input";
import type {
  ApuActivityDetail,
  ApuActivityRow,
  ApuItemRow,
} from "@/lib/tenant-db";
import {
  addCompositionAction,
  createApuActivityAction,
  getActivityDetailAction,
  removeCompositionAction,
  updateApuActivityAction,
  type ApuActivityFormState,
  type ApuMutationState,
} from "../actions";
import Modal from "./modal";
import { ApuCategoryBadge } from "./quote-badges";

type P99Thresholds = {
  activityUnitCost: Record<string, string>;
  itemConsumption: Record<string, string>;
};

const INITIAL_ACTIVITY_STATE: ApuActivityFormState = { status: "idle" };
const INITIAL_MUTATION_STATE: ApuMutationState = { status: "idle" };

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-border-strong focus:border-accent focus:outline-2 focus:outline-accent/30";

type CompRow = { itemId: string; consumption: string; wastePercent: string };

function fieldError(errors?: { [key: string]: string }, field?: string) {
  return errors?.[field ?? ""];
}

/**
 * Editor de composición: filas de insumo + rendimiento + desperdicio.
 * Serializa a `compositionsJson` que valida la Server Action.
 */
function CompositionEditor({
  items,
  comps,
  onChange,
}: {
  items: ApuItemRow[];
  comps: CompRow[];
  onChange: (next: CompRow[]) => void;
}) {
  const update = (index: number, patch: Partial<CompRow>) => {
    onChange(comps.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground/80">
          Composición (insumos de la actividad)
        </span>
        <button
          type="button"
          onClick={() =>
            onChange([...comps, { itemId: "", consumption: "", wastePercent: "0" }])
          }
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          Agregar insumo
        </button>
      </div>

      {comps.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Sin insumos. Agrega al menos uno para poder cotizar esta actividad.
        </p>
      ) : (
        <div className="space-y-2">
          {comps.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-border bg-muted/60 p-2">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem]">
                <select
                  value={row.itemId}
                  onChange={(event) => update(index, { itemId: event.target.value })}
                  aria-label={`Insumo ${index + 1}`}
                  className={inputClass}
                >
                  <option value="">Selecciona insumo…</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({formatApuUnit(item.unit)})
                    </option>
                  ))}
                </select>
                <input
                  value={row.consumption}
                  onChange={(event) =>
                    update(index, { consumption: event.target.value })
                  }
                  inputMode="decimal"
                  aria-label={`Rendimiento ${index + 1}`}
                  placeholder="Rendimiento"
                  className={inputClass}
                />
                <input
                  value={row.wastePercent}
                  onChange={(event) =>
                    update(index, { wastePercent: event.target.value })
                  }
                  inputMode="decimal"
                  aria-label={`Desperdicio % ${index + 1}`}
                  placeholder="Desp. %"
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                aria-label={`Quitar insumo ${index + 1}`}
                onClick={() => onChange(comps.filter((_, i) => i !== index))}
                className="self-start rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Rendimiento = cantidad por unidad de actividad (ej. 0.25 M3 por M2
        de muro). Desperdicio en % (0-50).
      </p>
    </div>
  );
}

/**
 * Modal de creación/edición de actividad. En edición carga la composición
 * actual vía Server Action antes de renderizar el editor.
 */
function ActivityForm({
  tenantSlug,
  activityId,
  items,
  defaults,
  loadComps,
  onDone,
}: {
  tenantSlug: string;
  activityId?: string;
  items: ApuItemRow[];
  defaults: {
    code: string;
    name: string;
    unit: string;
    description: string;
  };
  loadComps?: boolean;
  onDone: () => void;
}) {
  const action = activityId ? updateApuActivityAction : createApuActivityAction;
  const [state, formAction, isPending] = useActionState(
    action,
    INITIAL_ACTIVITY_STATE,
  );
  const [comps, setComps] = useState<CompRow[]>([]);
  const [loadingComps, setLoadingComps] = useState(loadComps ?? false);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "ok") {
      router.refresh();
      onDone();
    }
  }, [state, onDone, router]);

  useEffect(() => {
    if (!loadComps || !activityId) {
      return;
    }
    let cancelled = false;
    void getActivityDetailAction(tenantSlug, activityId).then((detail) => {
      if (cancelled) {
        return;
      }
      if (detail) {
        setComps(
          detail.compositions.map((composition) => ({
            itemId: composition.itemId,
            consumption: composition.consumption,
            wastePercent: composition.wastePercent,
          })),
        );
      }
      setLoadingComps(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activityId, loadComps, tenantSlug]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      {activityId ? (
        <input type="hidden" name="activityId" value={activityId} />
      ) : null}
      <input
        type="hidden"
        name="compositionsJson"
        value={JSON.stringify(comps)}
      />

      {state.status === "error" && state.message ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-foreground/80">
            Código (opcional)
          </span>
          <input
            name="code"
            defaultValue={defaults.code}
            placeholder="EJ: ACT-001"
            className={inputClass}
          />
          {fieldError(state.errors, "code") ? (
            <span className="mt-1 block text-xs text-destructive">
              {fieldError(state.errors, "code")}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-foreground/80">
            Unidad
          </span>
          <select name="unit" defaultValue={defaults.unit} className={inputClass}>
            <option value="">Selecciona…</option>
            {APU_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {formatApuUnit(unit)}
              </option>
            ))}
          </select>
          {fieldError(state.errors, "unit") ? (
            <span className="mt-1 block text-xs text-destructive">
              {fieldError(state.errors, "unit")}
            </span>
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground/80">
          Nombre de la actividad
        </span>
        <input
          name="name"
          defaultValue={defaults.name}
          placeholder="Ej: Muro en bloque No. 4"
          className={inputClass}
        />
        {fieldError(state.errors, "name") ? (
          <span className="mt-1 block text-xs text-destructive">
            {fieldError(state.errors, "name")}
          </span>
        ) : null}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground/80">
          Descripción (opcional)
        </span>
        <textarea
          name="description"
          defaultValue={defaults.description}
          rows={2}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground focus:border-accent focus:outline-2 focus:outline-accent/30"
        />
        {fieldError(state.errors, "description") ? (
          <span className="mt-1 block text-xs text-destructive">
            {fieldError(state.errors, "description")}
          </span>
        ) : null}
      </label>

      {loadingComps ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <NLoader size={16} className="text-current" />
          Cargando composición…
        </div>
      ) : (
        <>
          <CompositionEditor items={items} comps={comps} onChange={setComps} />
          {fieldError(state.errors, "compositions") ? (
            <span className="block text-xs text-destructive">
              {fieldError(state.errors, "compositions")}
            </span>
          ) : null}
        </>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending || loadingComps}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Guardando…"
            : activityId
              ? "Guardar cambios"
              : "Crear actividad"}
        </button>
      </div>
    </form>
  );
}

/** Modal de composición editable: lectura + add/remove insumo. */
function ActivityDetail({
  detail,
  tenantSlug,
  items,
  p99Thresholds,
}: {
  detail: ApuActivityDetail | null;
  tenantSlug: string;
  items: ApuItemRow[];
  p99Thresholds: P99Thresholds | null;
}) {
  const router = useRouter();
  const [addState, addAction, adding] = useActionState(
    addCompositionAction,
    INITIAL_MUTATION_STATE,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeCompositionAction,
    INITIAL_MUTATION_STATE,
  );
  const busy = adding || removing;
  const errorMessage = [addState, removeState].find((s) => s.status === "error")?.message;

  useEffect(() => {
    if (addState.status === "ok" || removeState.status === "ok") {
      router.refresh();
    }
  }, [addState.status, removeState.status, router]);

  if (!detail) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <NLoader size={16} className="text-current" />
        Cargando…
      </div>
    );
  }

  const activityP99 = p99Thresholds?.activityUnitCost[detail.unit] ?? p99Thresholds?.activityUnitCostP99?.[detail.unit];
  const activityMedian = p99Thresholds?.activityUnitCostMedian?.[detail.unit];
  const isActivityOutlier =
    activityP99 &&
    activityMedian &&
    parseFloat(detail.unitCost) > parseFloat(activityP99) &&
    parseFloat(detail.unitCost) > parseFloat(activityMedian) * 2;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {detail.code ? <span className="font-mono text-xs text-accent-text">{detail.code} · </span> : null}
          {detail.description}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            Costo unitario: {formatCurrency(detail.unitCost)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              / {formatApuUnit(detail.unit)}
            </span>
          </p>
          {isActivityOutlier && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-xs font-medium text-amber" title={`Costo > p99 (${activityP99}) para actividades en ${detail.unit}`}>
              <AlertTriangle aria-hidden="true" className="h-3 w-3" />
              Revisar
            </span>
          )}
        </div>
      </div>

      <CompositionEditorDetail
        items={items}
        detail={detail}
        tenantSlug={tenantSlug}
        p99Thresholds={p99Thresholds}
        addAction={addAction}
        removeAction={removeAction}
        busy={busy}
      />

      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}

function CompositionEditorDetail({
  items,
  detail,
  tenantSlug,
  p99Thresholds,
  addAction,
  removeAction,
  busy,
}: {
  items: ApuItemRow[];
  detail: ApuActivityDetail;
  tenantSlug: string;
  p99Thresholds: P99Thresholds | null;
  addAction: (formData: FormData) => void;
  removeAction: (formData: FormData) => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground/80">
          Composición (insumos de la actividad)
        </span>
        <form action={addAction}>
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="activityId" value={detail.id} />
          <div className="flex flex-wrap gap-2">
            <select
              name="itemId"
              required
              disabled={busy}
              className="min-w-[16rem] h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition focus:border-accent focus:outline-2 focus:outline-accent/30 disabled:opacity-50"
            >
              <option value="">Selecciona insumo…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatApuUnit(item.unit)})
                </option>
              ))}
            </select>
            <input
              name="consumption"
              type="number"
              step="0.001"
              min="0.001"
              required
              placeholder="Rendimiento"
              disabled={busy}
              className="w-28 h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition focus:border-accent focus:outline-2 focus:outline-accent/30 disabled:opacity-50"
            />
            <input
              name="wastePercent"
              type="number"
              step="0.01"
              min="0"
              max="50"
              value="0"
              placeholder="Desp. %"
              disabled={busy}
              className="w-24 h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition focus:border-accent focus:outline-2 focus:outline-accent/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              Agregar
            </button>
          </div>
        </form>
      </div>

      {detail.compositions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Sin insumos. Agrega al menos uno para poder cotizar esta actividad.
        </p>
      ) : (
        <div className="space-y-2">
          {detail.compositions.map((composition) => {
            const itemP99 = p99Thresholds?.itemConsumption[composition.itemUnit] ?? p99Thresholds?.itemConsumptionP99?.[composition.itemUnit];
            const itemMedian = p99Thresholds?.itemConsumptionMedian?.[composition.itemUnit];
            const isConsumptionOutlier =
              itemP99 &&
              itemMedian &&
              parseFloat(composition.consumption) > parseFloat(itemP99) &&
              parseFloat(composition.consumption) > parseFloat(itemMedian) * 2;
            return (
              <form key={composition.id} action={removeAction} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-border bg-muted/60 p-2">
                <input type="hidden" name="tenantSlug" value={tenantSlug} />
                <input type="hidden" name="activityId" value={detail.id} />
                <input type="hidden" name="itemId" value={composition.itemId} />
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_5.5rem] items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {composition.itemName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatApuUnit(composition.itemUnit)})
                    </span>
                    {isConsumptionOutlier && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber/10 px-1.5 py-0.5 text-[10px] font-medium text-amber" title={`Consumo > p99 (${itemP99}) para insumos en ${composition.itemUnit}`}>
                        <AlertTriangle aria-hidden="true" className="h-2.5 w-2.5" />
                        Revisar
                      </span>
                    )}
                  </div>
                  <span className="text-right text-sm text-muted-foreground font-mono">
                    {formatCurrency(composition.unitPrice)}
                  </span>
                  <span className="text-right text-sm text-muted-foreground font-mono">
                    {composition.consumption}
                    {isConsumptionOutlier && " ⚠"}
                  </span>
                  <span className="text-right text-sm text-muted-foreground font-mono">
                    {composition.wastePercent}%
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="self-start rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  aria-label={`Quitar ${composition.itemName}`}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </form>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Rendimiento = cantidad por unidad de actividad (ej. 0.25 M3 por M2
        de muro). Desperdicio en % (0-50). Badge "Revisar" = p99 del catálogo.
      </p>
    </div>
  );
}

/**
 * Catálogo de actividades APU: lista con costo unitario calculado y
 * composición por modal (lectura y edición).
 */
export default function ActivityCatalog({
  tenantSlug,
  rows,
  items,
  activityLabel,
  p99Thresholds = null,
}: {
  tenantSlug: string;
  rows: ApuActivityRow[];
  items: ApuItemRow[];
  activityLabel: string;
  p99Thresholds?: P99Thresholds | null;
}) {
  const [modal, setModal] = useState<
    | { type: "create" }
    | { type: "edit"; row: ApuActivityRow }
    | { type: "detail"; row: ApuActivityRow }
    | null
  >(null);
  const [detail, setDetail] = useState<ApuActivityDetail | null>(null);

  const openDetail = async (row: ApuActivityRow, type: "detail" | "edit") => {
    setDetail(null);
    setModal({ type, row });
    const result = await getActivityDetailAction(tenantSlug, row.id);
    setDetail(result);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          paramKey="aq"
          pageParam="aqpage"
          ariaLabel={`Buscar en catálogo de ${activityLabel.toLowerCase()}`}
          placeholder={`Buscar ${activityLabel.toLowerCase()} o código…`}
          defaultValue=""
        />
        <button
          type="button"
          onClick={() => setModal({ type: "create" })}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nueva {activityLabel.toLowerCase()}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 text-right font-medium">
                Costo unitario
              </th>
              <th className="px-4 py-3 text-right font-medium">Insumos</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
<tbody className="divide-y divide-border">
             {rows.length === 0 ? (
               <tr>
                 <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                   Sin {activityLabel.toLowerCase()} por mostrar.
                 </td>
               </tr>
             ) : (
               rows.map((row) => {
                 const p99 = p99Thresholds?.activityUnitCost[row.unit] ?? p99Thresholds?.activityUnitCostP99?.[row.unit];
                 const median = p99Thresholds?.activityUnitCostMedian?.[row.unit];
                 const isOutlier = p99 && median && parseFloat(row.unitCost) > parseFloat(p99) && parseFloat(row.unitCost) > parseFloat(median) * 2;
                 return (
                   <tr key={row.id} className="transition hover:bg-muted/60">
                     <td className="px-4 py-3 font-mono text-xs font-medium text-accent-text">
                       {row.code ?? "—"}
                     </td>
                     <td className="px-4 py-3 font-medium text-foreground">
                       {row.name}
                     </td>
                     <td className="px-4 py-3 text-muted-foreground">
                       {formatApuUnit(row.unit)}
                     </td>
                     <td className="px-4 py-3 text-right font-semibold text-foreground">
                       <div className="flex items-center justify-end gap-1.5">
                         {formatCurrency(row.unitCost)}
                         {isOutlier && (
                           <span className="inline-flex items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-xs font-medium text-amber" title={`Costo > p99 (${p99}) para actividades en ${row.unit}`}>
                             <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                             Revisar
                           </span>
                         )}
                       </div>
                     </td>
                     <td className="px-4 py-3 text-right">
                       <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                         <Layers aria-hidden="true" className="h-3.5 w-3.5" />
                         {row.itemCount}
                       </span>
                     </td>
                     <td className="px-4 py-3 text-right">
                       <div className="inline-flex items-center gap-1">
                         <button
                           type="button"
                           onClick={() => void openDetail(row, "detail")}
                           className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                         >
                           <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                           Ver
                         </button>
                         <button
                           type="button"
                           onClick={() => void openDetail(row, "edit")}
                           className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                         >
                           <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                           Editar
                         </button>
                       </div>
                     </td>
                   </tr>
                 );
               })
             )}
           </tbody>
        </table>
      </div>

      <Modal
        open={modal?.type === "detail"}
        onClose={() => setModal(null)}
        title={modal?.type === "detail" ? modal.row.name : activityLabel}
        wide
      >
        <ActivityDetail
          detail={detail}
          tenantSlug={tenantSlug}
          items={items}
          p99Thresholds={p99Thresholds}
        />
      </Modal>

      <Modal
        open={modal?.type === "edit"}
        onClose={() => setModal(null)}
        title={`Editar ${activityLabel.toLowerCase()}`}
        wide
      >
        {modal?.type === "edit" ? (
          <ActivityForm
            tenantSlug={tenantSlug}
            activityId={modal.row.id}
            items={items}
            defaults={{
              code: modal.row.code ?? "",
              name: modal.row.name,
              unit: modal.row.unit,
              description: modal.row.description ?? "",
            }}
            loadComps
            onDone={() => setModal(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={modal?.type === "create"}
        onClose={() => setModal(null)}
        title={`Nueva ${activityLabel.toLowerCase()}`}
        wide
      >
        <ActivityForm
          tenantSlug={tenantSlug}
          items={items}
          defaults={{ code: "", name: "", unit: "", description: "" }}
          onDone={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}