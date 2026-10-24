"use client";

import { MoneyInput } from "@/components/molecules/money-input";
import { parseMoney } from "@/lib/business/money";
import { apuImageUrl } from "@/lib/construction/apu-images";
import { useEffect, useState, useTransition } from "react";
import { useActionState, useRef } from "react";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileUp, Pencil, Plus } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { formatCurrency } from "@/lib/format";
import {
  APU_ITEM_CATEGORIES,
  APU_UNITS,
  formatApuUnit,
  type ApuItemCategoryValue,
} from "@/lib/construction/apu-engine";
import SearchInput from "@/components/molecules/search-input";
import FilterSelect from "@/components/molecules/filter-select";
import type { ApuItemRow } from "@/lib/tenant/db";
import {
  parseImportCsv,
  type ApuItemFormValues,
} from "../validators";
import {
  archiveApuItemAction,
  createApuItemAction,
  deleteApuItemAction,
  importApuItemsAction,
  restoreApuItemAction,
  updateApuItemAction,
  type ApuItemFormState,
  type ApuMutationState,
  type ImportResultState,
} from "../actions";
import Modal from "@/components/organisms/modal";
import { ApuCategoryBadge } from "@/components/molecules/quote-badges";
import { fieldClasses, inputClasses, labelClasses } from "@/components/atoms/input";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";
import { Select } from "@/components/atoms/select";

const EMPTY_ITEM: ApuItemFormValues = {
  code: "",
  name: "",
  unit: "",
  category: "",
  unitPrice: "",
  imageUrl: "",
};

const INITIAL_ITEM_STATE: ApuItemFormState = { status: "idle" };
const INITIAL_IMPORT_STATE: ImportResultState = { status: "idle" };
const INITIAL_MUTATION_STATE: ApuMutationState = { status: "idle" };

const inputClass =
  inputClasses;

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
  imageId = null,
  onDone,
}: {
  tenantSlug: string;
  itemId?: string;
  defaults: ApuItemFormValues;
  /** Foto actual del insumo guardada en el sistema. */
  imageId?: string | null;
  onDone: () => void;
}) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(apuImageUrl(imageId));
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
        <p className="rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClasses}>
            Código (opcional)
          </span>
          <input
            name="code"
            defaultValue={defaults.code}
            placeholder="EJ: CEM-02"
            className={inputClass}
          />
          {fieldError(state.errors, "code") ? (
            <span className="mt-1 block text-xs text-destructive">
              {fieldError(state.errors, "code")}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className={labelClasses}>
            Unidad
          </span>
          <Select
            name="unit"
            defaultValue={defaults.unit}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {APU_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {formatApuUnit(unit)}
              </option>
            ))}
          </Select>
          {fieldError(state.errors, "unit") ? (
            <span className="mt-1 block text-xs text-destructive">
              {fieldError(state.errors, "unit")}
            </span>
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className={labelClasses}>
          Nombre del insumo
        </span>
        <input
          name="name"
          defaultValue={defaults.name}
          placeholder="Ej: Cemento gris 50 kg"
          className={inputClass}
        />
        {fieldError(state.errors, "name") ? (
          <span className="mt-1 block text-xs text-destructive">
            {fieldError(state.errors, "name")}
          </span>
        ) : null}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClasses}>
            Categoría
          </span>
          <Select
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
          </Select>
          {fieldError(state.errors, "category") ? (
            <span className="mt-1 block text-xs text-destructive">
              {fieldError(state.errors, "category")}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className={labelClasses}>
            Precio unitario (COP)
          </span>
          <MoneyInput
            name="unitPrice"
            defaultValue={parseMoney(String(defaults.unitPrice ?? ""))}
            placeholder="35.000"
            className={inputClass}
          />
          {fieldError(state.errors, "unitPrice") ? (
            <span className="mt-1 block text-xs text-destructive">
              {fieldError(state.errors, "unitPrice")}
            </span>
          ) : null}
        </label>
      </div>

      <div className="flex items-start gap-3">
        {photoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local o foto servida por la API propia
          <img src={photoPreview} alt="" className="h-16 w-16 shrink-0 rounded-md border border-border bg-card object-contain" />
        ) : (
          <span aria-hidden="true" className="h-16 w-16 shrink-0 rounded-md border border-dashed border-border" />
        )}
        <label htmlFor={`item-photo-${itemId ?? "new"}`} className="block min-w-0 flex-1">
          <span className={labelClasses}>
            Foto del insumo (PNG, JPG, GIF o WEBP, máx. 2 MB)
          </span>
          <input
            id={`item-photo-${itemId ?? "new"}`}
            name="imageFile"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPhotoPreview(file ? URL.createObjectURL(file) : apuImageUrl(imageId));
            }}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground/80 hover:file:bg-muted"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            La foto se guarda en el sistema. Si no eliges una, se conserva la actual.
          </span>
        </label>
      </div>
      <div>
        {fieldError(state.errors, "imageUrl") ? (
          <span className="mt-1 block text-xs text-destructive">
            {fieldError(state.errors, "imageUrl")}
          </span>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className={buttonVariants({ size: "sm" })}
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
        <p className="rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger">
          {state.message}
        </p>
      ) : null}

      <div>
        <label className={labelClasses}>
          Pegar CSV o subir archivo (.csv / .txt)
        </label>
        <div className="mb-2 flex items-center gap-2">
          <label className={`${buttonVariants({ variant: "outline", size: "sm" })} cursor-pointer`}>
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
          className={cn(fieldClasses, "py-2 w-full font-mono text-xs")}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Columnas: código (opcional), nombre, unidad (M3, KG, BULTO, HR,
          UND, M2, ML, GLB, L, M, CM, PZA), categoría (Material, Mano de
          Obra, Equipo, Transporte), precio unitario.
        </p>
        {previewMessage ? (
          <p
            className={
              preview.ok
                ? "mt-2 text-xs font-medium text-success"
                : "mt-2 text-xs font-medium text-destructive"
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
          className={buttonVariants({ size: "sm" })}
        >
          {isPending ? "Importando…" : "Importar (upsert atómico)"}
        </button>
      </div>
    </form>
  );
}

/**
 * Acciones por fila del banco: editar (para todos) + archivar/restaurar y
 * borrar (solo OWNER/SUPERADMIN). El borrado pide confirmación y el servidor
 * lo bloquea si el insumo está en uso.
 */
function RowActions({
  tenantSlug,
  row,
}: {
  tenantSlug: string;
  row: ApuItemRow;
}) {
  const router = useRouter();
  const [archiveState, archiveAction, archiving] = useActionState(
    archiveApuItemAction,
    INITIAL_MUTATION_STATE,
  );
  const [restoreState, restoreAction, restoring] = useActionState(
    restoreApuItemAction,
    INITIAL_MUTATION_STATE,
  );
  const [confirm, confirmDialog] = useConfirm();
  const deleteFormRef = useRef<HTMLFormElement>(null);
  // El envío confirmado vuelve a pasar por onSubmit: esta marca lo deja seguir.
  const deleteConfirmed = useRef(false);
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteApuItemAction,
    INITIAL_MUTATION_STATE,
  );
  const busy = archiving || restoring || deleting;
  const errorMessage = [archiveState, restoreState, deleteState].find(
    (state) => state.status === "error",
  )?.message;

  useEffect(() => {
    if (
      archiveState.status === "ok" ||
      restoreState.status === "ok" ||
      deleteState.status === "ok"
    ) {
      router.refresh();
    }
  }, [archiveState.status, restoreState.status, deleteState.status, router]);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <form action={row.active ? archiveAction : restoreAction}>
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="itemId" value={row.id} />
          <button
            type="submit"
            disabled={busy}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {row.active ? "Archivar" : "Restaurar"}
          </button>
        </form>
        <form
          ref={deleteFormRef}
          action={deleteAction}
          onSubmit={(event) => {
            if (deleteConfirmed.current) {
              deleteConfirmed.current = false;
              return;
            }
            event.preventDefault();
            void confirm({
              title: "¿Borrar este insumo?",
              description: "Se borra definitivamente. Solo es posible si no está en uso en ninguna actividad.",
              confirmLabel: "Borrar insumo",
            }).then((ok) => {
              if (!ok) return;
              deleteConfirmed.current = true;
              deleteFormRef.current?.requestSubmit();
            });
          }}
        >
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="itemId" value={row.id} />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-8 items-center rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 text-xs font-medium text-destructive transition hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Borrar
          </button>
        </form>
      </div>
      {errorMessage ? (
        <span className="max-w-[16rem] text-right text-[10px] leading-tight text-destructive">
          {errorMessage}
        </span>
      ) : null}
      {confirmDialog}
    </div>
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
  canManage = false,
  activeFilter = "",
}: {
  tenantSlug: string;
  rows: ApuItemRow[];
  total: number;
  page: number;
  itemLabel: string;
  /** OWNER/SUPERADMIN: habilitan archivar/restaurar/borrar. */
  canManage?: boolean;
  /** "" = todos, "active" = vigentes, "archived" = archivados. */
  activeFilter?: string;
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
          <FilterSelect
            paramKey="ia"
            pageParam="ipage"
            allLabel="Vigentes y archivados"
            options={[
              { value: "active", label: "Solo vigentes" },
              { value: "archived", label: "Solo archivados" },
            ]}
            value={activeFilter}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModal({ type: "import" })}
            className={buttonVariants({ variant: "outline" })}
          >
            <FileUp aria-hidden="true" className="h-4 w-4" />
            Importar CSV
          </button>
          <button
            type="button"
            onClick={() => setModal({ type: "create" })}
            className={buttonVariants()}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nuevo {itemLabel.toLowerCase()}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted text-left text-xs font-semibold text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 text-right font-medium">
                Precio unitario
              </th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Sin insumos por mostrar. Crea el primero o importa un CSV.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-muted/60">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-accent-text">
                    {row.code ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {row.imageId ? (
                        // eslint-disable-next-line @next/next/no-img-element -- foto servida por la API propia, con caché
                        <img src={apuImageUrl(row.imageId)!} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-md border border-border bg-card object-contain" />
                      ) : (
                        <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded-md border border-dashed border-border" />
                      )}
                      <span className="font-medium text-foreground">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ApuCategoryBadge category={row.category} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatApuUnit(row.unit)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    {formatCurrency(row.unitPrice)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.active
                          ? "inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                          : "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {row.active ? "Vigente" : "Archivado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setModal({ type: "edit", row })}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      {canManage ? (
                        <RowActions tenantSlug={tenantSlug} row={row} />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · {total} {itemLabel.toLowerCase()}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => navigatePage(page - 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => navigatePage(page + 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {isPending ? (
                <NLoader size={16} className="text-current" />
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
              imageUrl: modal.row.imageUrl ?? "",
            }}
            imageId={modal.row.imageId}
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