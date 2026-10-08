"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileUp, Loader2, Pencil, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  APU_ITEM_CATEGORIES,
  APU_UNITS,
  type ApuItemCategoryValue,
} from "@/lib/apu-engine";
import SearchInput from "@/app/components/tenant/search-input";
import FilterSelect from "@/app/components/tenant/filter-select";
import type { ApuItemRow } from "@/lib/tenant-db";
import {
  parseImportCsv,
  type ApuItemFormValues,
} from "../validators";
import {
  createApuItemAction,
  importApuItemsAction,
  updateApuItemAction,
  type ApuItemFormState,
  type ImportResultState,
} from "../actions";
import Modal from "./modal";
import { ApuCategoryBadge } from "./quote-badges";

const EMPTY_ITEM: ApuItemFormValues = {
  code: "",
  name: "",
  unit: "",
  category: "",
  unitPrice: "",
};

const INITIAL_ITEM_STATE: ApuItemFormState = { status: "idle" };
const INITIAL_IMPORT_STATE: ImportResultState = { status: "idle" };

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:outline-2 focus:outline-indigo-500/30";

function fieldError(errors?: { [key: string]: string }, field?: string) {
  return errors?.[field ?? ""];
}

/**
 * Formulario de creación/edición de un insumo (Server Action + useActionState).
 */
function ItemForm({
  tenantSlug,
  itemId,
  defaults,
  onDone,
}: {
  tenantSlug: string;
  itemId?: string;
  defaults: ApuItemFormValues;
  onDone: () => void;
}) {
  const action = itemId ? updateApuItemAction : createApuItemAction;
  const [state, formAction, isPending] = useActionState(action, INITIAL_ITEM_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "ok") {
      router.refresh();
      onDone();
    }
  }, [state, onDone, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      {itemId ? <input type="hidden" name="itemId" value={itemId} /> : null}

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
            placeholder="EJ: CEM-02"
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
          <select
            name="unit"
            defaultValue={defaults.unit}
            className={inputClass}
          >
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
          Nombre del insumo
        </span>
        <input
          name="name"
          defaultValue={defaults.name}
          placeholder="Ej: Cemento gris 50 kg"
          className={inputClass}
        />
        {fieldError(state.errors, "name") ? (
          <span className="mt-1 block text-xs text-rose-600">
            {fieldError(state.errors, "name")}
          </span>
        ) : null}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Categoría
          </span>
          <select
            name="category"
            defaultValue={defaults.category}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {APU_ITEM_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          {fieldError(state.errors, "category") ? (
            <span className="mt-1 block text-xs text-rose-600">
              {fieldError(state.errors, "category")}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Precio unitario (COP)
          </span>
          <input
            name="unitPrice"
            inputMode="decimal"
            defaultValue={defaults.unitPrice}
            placeholder="Ej: 35000"
            className={inputClass}
          />
          {fieldError(state.errors, "unitPrice") ? (
            <span className="mt-1 block text-xs text-rose-600">
              {fieldError(state.errors, "unitPrice")}
            </span>
          ) : null}
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Guardando…" : itemId ? "Guardar cambios" : "Crear insumo"}
        </button>
      </div>
    </form>
  );
}

/**
 * Modal de importación CSV/Excel: pega o sube el archivo (el contenido se
 * lee en el navegador), se previsualiza el parseo y al enviar se ejecuta
 * un upsert atómico en una sola transacción.
 */
function ImportForm({
  tenantSlug,
  onDone,
}: {
  tenantSlug: string;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    importApuItemsAction,
    INITIAL_IMPORT_STATE,
  );
  const [text, setText] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (state.status === "ok") {
      router.refresh();
      onDone();
    }
  }, [state, onDone, router]);

  const handleFile = async (file: File | null) => {
    if (!file) {
      return;
    }
    setText(await file.text());
  };

  const preview = parseImportCsv(text);
  const previewMessage =
    text.trim() === ""
      ? ""
      : preview.ok
        ? `${preview.rows.length} fila(s) listas para importar.`
        : `No se importará nada: ${preview.errors[0]}${
            preview.errors.length > 1 ? ` (+${preview.errors.length - 1} más)` : ""
          }`;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="importText" value={text} />

      {state.status === "error" && state.message ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Pegar CSV o subir archivo (.csv / .txt)
        </label>
        <div className="mb-2 flex items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <FileUp aria-hidden="true" className="h-4 w-4" />
            Subir archivo
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              className="hidden"
              onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          placeholder={
            "code,name,unit,category,unitPrice\nCEM-02,Cemento gris 50 kg,BULTO,MATERIAL,35000"
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-2 focus:outline-indigo-500/30"
        />
        <p className="mt-1 text-xs text-slate-500">
          Columnas: código (opcional), nombre, unidad (M3, KG, BULTO, HR,
          UND, M2, ML, GLB, L, M, CM, PZA), categoría (Material, Mano de
          Obra, Equipo, Transporte), precio unitario.
        </p>
        {previewMessage ? (
          <p
            className={
              preview.ok
                ? "mt-2 text-xs font-medium text-emerald-700"
                : "mt-2 text-xs font-medium text-rose-600"
            }
          >
            {previewMessage}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending || !preview.ok}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Importando…" : "Importar (upsert atómico)"}
        </button>
      </div>
    </form>
  );
}

/**
 * Banco de insumos: buscador/filtro en la URL, tabla, edición y CSV.
 */
export default function ItemsBank({
  tenantSlug,
  rows,
  total,
  page,
  itemLabel,
}: {
  tenantSlug: string;
  rows: ApuItemRow[];
  total: number;
  page: number;
  itemLabel: string;
}) {
  const [modal, setModal] = useState<
    | { type: "create" }
    | { type: "edit"; row: ApuItemRow }
    | { type: "import" }
    | null
  >(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const navigatePage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ipage", String(next));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            paramKey="iq"
            pageParam="ipage"
            ariaLabel={`Buscar en banco de insumos`}
            placeholder="Buscar insumo o código…"
            defaultValue=""
          />
          <FilterSelect
            paramKey="ic"
            pageParam="ipage"
            allLabel="Todas las categorías"
            options={APU_ITEM_CATEGORIES}
            value=""
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModal({ type: "import" })}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FileUp aria-hidden="true" className="h-4 w-4" />
            Importar CSV
          </button>
          <button
            type="button"
            onClick={() => setModal({ type: "create" })}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nuevo {itemLabel.toLowerCase()}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 text-right font-medium">
                Precio unitario
              </th>
              <th className="px-4 py-3 text-right font-medium">Editar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Sin insumos por mostrar. Crea el primero o importa un CSV.
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
                  <td className="px-4 py-3">
                    <ApuCategoryBadge category={row.category} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.unit}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(row.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setModal({ type: "edit", row })}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            Página {page} de {totalPages} · {total} {itemLabel.toLowerCase()}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => navigatePage(page - 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => navigatePage(page + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : null}
              Siguiente
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        open={modal?.type === "create"}
        onClose={() => setModal(null)}
        title={`Nuevo ${itemLabel.toLowerCase()}`}
      >
        <ItemForm
          tenantSlug={tenantSlug}
          defaults={EMPTY_ITEM}
          onDone={() => setModal(null)}
        />
      </Modal>

      <Modal
        open={modal?.type === "edit"}
        onClose={() => setModal(null)}
        title={`Editar ${itemLabel.toLowerCase()}`}
      >
        {modal?.type === "edit" ? (
          <ItemForm
            tenantSlug={tenantSlug}
            itemId={modal.row.id}
            defaults={{
              code: modal.row.code ?? "",
              name: modal.row.name,
              unit: modal.row.unit,
              category: modal.row.category as ApuItemCategoryValue,
              unitPrice: modal.row.unitPrice,
            }}
            onDone={() => setModal(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={modal?.type === "import"}
        onClose={() => setModal(null)}
        title="Importar insumos (CSV/Excel)"
        wide
      >
        <ImportForm tenantSlug={tenantSlug} onDone={() => setModal(null)} />
      </Modal>
    </div>
  );
}