"use client";

import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { NLoader } from "@/components/atoms/n-loader";
import Modal from "@/components/organisms/modal";
import { APU_UNITS, moneyToString } from "@/lib/apu-engine";
import {
  createBudgetItemAction,
  updateBudgetItemAction,
  type BudgetItemFormState,
} from "../budget/actions";

const IDLE_STATE: BudgetItemFormState = { status: "idle" };

const FIELD_CLASS = (hasError: boolean) =>
  [
    "mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
    hasError
      ? "border-destructive/30 focus:border-destructive focus:outline-destructive/30"
      : "border-border hover:border-foreground/20 focus:border-gold-500 focus:outline-gold-600/30",
  ].join(" ");

/** micro-string → decimal legible ("1000000"→"1", "12500000"→"12.5"). */
function microToDecimal(raw: string): string {
  try {
    return moneyToString(BigInt(raw));
  } catch {
    return raw;
  }
}

/** Valores serializables de una partida para el modo edición (micro-units). */
export type EditableBudgetItem = {
  id: string;
  code: string;
  description: string;
  unit: string;
  /** Micro-unidades como string ("12500000" = 12.5). */
  quantity: string;
  /** Micro-pesos como string ("20000000000" = 20.000,00). */
  unitCost: string;
};

/** Modal para crear o editar una partida (ítem) dentro de un capítulo. */
export default function ItemModal({
  open,
  onClose,
  tenantSlug,
  projectId,
  chapterId,
  chapterLabel,
  expectedRevision,
  item,
}: {
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
  projectId: string;
  chapterId: string;
  chapterLabel: string;
  expectedRevision: number;
  item?: EditableBudgetItem;
}) {
  const isEditing = Boolean(item);
  const [state, formAction, isPending] = useActionState(
    isEditing ? updateBudgetItemAction : createBudgetItemAction,
    IDLE_STATE,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status === "ok") {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const errors = state.errors ?? {};
  const defaults = {
    code: state.values?.code ?? item?.code ?? "",
    description: state.values?.description ?? item?.description ?? "",
    unit: state.values?.unit ?? item?.unit ?? "",
    quantity:
      state.values?.quantity ?? (item ? microToDecimal(item.quantity) : ""),
    unitCost:
      state.values?.unitCost ?? (item ? microToDecimal(item.unitCost) : ""),
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
      title={
        isEditing
          ? `Editar partida — ${chapterLabel}`
          : `Nueva partida — ${chapterLabel}`
      }
      wide
    >
      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="chapterId" value={chapterId} />
        <input
          type="hidden"
          name="expectedRevision"
          value={String(expectedRevision)}
        />
        {item ? (
          <input type="hidden" name="itemId" value={item.id} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="item-description"
              className="text-sm font-medium text-foreground/80"
            >
              Descripción <span className="text-destructive">*</span>
            </label>
            <input
              id="item-description"
              name="description"
              defaultValue={defaults.description}
              placeholder="Ej. Excavación manual en material común"
              aria-invalid={Boolean(errors.description)}
              className={FIELD_CLASS(Boolean(errors.description))}
            />
            {errors.description ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.description}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="item-code"
              className="text-sm font-medium text-foreground/80"
            >
              Código
            </label>
            <input
              id="item-code"
              name="code"
              defaultValue={defaults.code}
              placeholder="Ej. 1.1"
              aria-invalid={Boolean(errors.code)}
              className={FIELD_CLASS(Boolean(errors.code))}
            />
            {errors.code ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.code}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="item-unit"
              className="text-sm font-medium text-foreground/80"
            >
              Unidad <span className="text-destructive">*</span>
            </label>
            <input
              id="item-unit"
              name="unit"
              list="apu-units"
              defaultValue={defaults.unit}
              placeholder="Ej. M3"
              aria-invalid={Boolean(errors.unit)}
              className={FIELD_CLASS(Boolean(errors.unit))}
            />
            <datalist id="apu-units">
              {APU_UNITS.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>
            {errors.unit ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.unit}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="item-quantity"
              className="text-sm font-medium text-foreground/80"
            >
              Cantidad <span className="text-destructive">*</span>
            </label>
            <input
              id="item-quantity"
              name="quantity"
              inputMode="decimal"
              defaultValue={defaults.quantity}
              placeholder="Ej. 12.5"
              aria-invalid={Boolean(errors.quantity)}
              className={FIELD_CLASS(Boolean(errors.quantity))}
            />
            {errors.quantity ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.quantity}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="item-unit-cost"
              className="text-sm font-medium text-foreground/80"
            >
              Costo unitario directo{" "}
              <span className="text-destructive">*</span>
            </label>
            <input
              id="item-unit-cost"
              name="unitCost"
              inputMode="decimal"
              defaultValue={defaults.unitCost}
              placeholder="COP, ej. 28500"
              aria-invalid={Boolean(errors.unitCost)}
              className={FIELD_CLASS(Boolean(errors.unitCost))}
            />
            {errors.unitCost ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.unitCost}
              </p>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          El costo total de la partida lo calcula el servidor (cantidad × costo
          unitario) y recalcula la cascada AIU.
        </p>

        {state.status === "error" && state.message ? (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {state.message}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <NLoader size={16} className="text-current" />
            ) : null}
            {isPending
              ? isEditing
                ? "Guardando…"
                : "Creando…"
              : isEditing
                ? "Guardar cambios"
                : "Crear partida"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
