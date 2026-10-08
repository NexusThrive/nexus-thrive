"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Layers, Loader2, Pencil, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { APU_UNITS } from "@/lib/apu-engine";
import SearchInput from "@/app/components/tenant/search-input";
import type {
  ApuActivityDetail,
  ApuActivityRow,
  ApuItemRow,
} from "@/lib/tenant-db";
import {
  createApuActivityAction,
  getActivityDetailAction,
  updateApuActivityAction,
  type ApuActivityFormState,
} from "../actions";
import Modal from "./modal";
import { ApuCategoryBadge } from "./quote-badges";

const INITIAL_ACTIVITY_STATE: ApuActivityFormState = { status: "idle" };

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:outline-2 focus:outline-indigo-500/30";

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
        <span className="text-sm font-medium text-slate-700">
          Composición (insumos de la actividad)
        </span>
        <button
          type="button"
          onClick={() =>
            onChange([...comps, { itemId: "", consumption: "", wastePercent: "0" }])
          }
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          Agregar insumo
        </button>
      </div>

      {comps.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
          Sin insumos. Agrega al menos uno para poder cotizar esta actividad.
        </p>
      ) : (
        <div className="space-y-2">
          {comps.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
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
                      {item.name} ({item.unit})
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
                className="self-start rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">
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
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Código (opcional)
          </span>
          <input
            name="code"
            defaultValue={defaults.code}
            placeholder="EJ: ACT-001"
            className={inputClass}
          />
          {fieldError(state.errors, "code") ? (
            <span className="mt-1 block text-xs text-rose-600">
              {fieldError(state.errors, "code")}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Unidad
          </span>
          <select name="unit" defaultValue={defaults.unit} className={inputClass}>
            <option value="">Selecciona…</option>
            {APU_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          {fieldError(state.errors, "unit") ? (
            <span className="mt-1 block text-xs text-rose-600">
              {fieldError(state.errors, "unit")}
            </span>
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Nombre de la actividad
        </span>
        <input
          name="name"
          defaultValue={defaults.name}
          placeholder="Ej: Muro en bloque No. 4"
          className={inputClass}
        />
        {fieldError(state.errors, "name") ? (
          <span className="mt-1 block text-xs text-rose-600">
            {fieldError(state.errors, "name")}
          </span>
        ) : null}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Descripción (opcional)
        </span>
        <textarea
          name="description"
          defaultValue={defaults.description}
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-2 focus:outline-indigo-500/30"
        />
        {fieldError(state.errors, "description") ? (
          <span className="mt-1 block text-xs text-rose-600">
            {fieldError(state.errors, "description")}
          </span>
        ) : null}
      </label>

      {loadingComps ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Cargando composición…
        </div>
      ) : (
        <>
          <CompositionEditor items={items} comps={comps} onChange={setComps} />
          {fieldError(state.errors, "compositions") ? (
            <span className="block text-xs text-rose-600">
              {fieldError(state.errors, "compositions")}
            </span>
          ) : null}
        </>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending || loadingComps}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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

/** Modal de lectura de la composición con costos calculados. */
function ActivityDetail({
  detail,
}: {
  detail: ApuActivityDetail | null;
}) {
  if (!detail) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        Cargando…
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          {detail.code ? <span className="font-mono text-xs text-indigo-600">{detail.code} · </span> : null}
          {detail.description}
        </p>
        <p className="text-sm font-semibold text-slate-900">
          Costo unitario: {formatCurrency(detail.unitCost)}
          <span className="ml-1 text-xs font-normal text-slate-400">
            / {detail.unit}
          </span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Insumo</th>
              <th className="px-3 py-2 font-medium">Categoría</th>
              <th className="px-3 py-2 text-right font-medium">Precio</th>
              <th className="px-3 py-2 text-right font-medium">Rendim.</th>
              <th className="px-3 py-2 text-right font-medium">Desp. %</th>
              <th className="px-3 py-2 text-right font-medium">Costo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {detail.compositions.map((composition) => (
              <tr key={composition.id}>
                <td className="px-3 py-2 font-medium text-slate-900">
                  {composition.itemName}
                  <span className="ml-1 text-xs text-slate-400">
                    {composition.itemUnit}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <ApuCategoryBadge category={composition.category} />
                </td>
                <td className="px-3 py-2 text-right text-slate-600">
                  {formatCurrency(composition.unitPrice)}
                </td>
                <td className="px-3 py-2 text-right text-slate-600">
                  {composition.consumption}
                </td>
                <td className="px-3 py-2 text-right text-slate-600">
                  {composition.wastePercent}%
                </td>
                <td className="px-3 py-2 text-right font-semibold text-slate-900">
                  {formatCurrency(composition.cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
}: {
  tenantSlug: string;
  rows: ApuActivityRow[];
  items: ApuItemRow[];
  activityLabel: string;
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
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nueva {activityLabel.toLowerCase()}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
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
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Sin {activityLabel.toLowerCase()} por mostrar.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-indigo-600">
                    {row.code ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.unit}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(row.unitCost)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Layers aria-hidden="true" className="h-3.5 w-3.5" />
                      {row.itemCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void openDetail(row, "detail")}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => void openDetail(row, "edit")}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
        <ActivityDetail detail={detail} />
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