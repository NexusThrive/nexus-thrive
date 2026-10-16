"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { NLoader } from "@/components/atoms/n-loader";
import Modal from "@/components/organisms/modal";
import {
  calculateBudgetTotals,
  percentToMicro,
} from "@/lib/apu-engine";
import { formatMoneyMicro } from "@/lib/format";
import {
  updateAiuConfigAction,
  type AiuFormState,
} from "../budget/actions";

const IDLE_STATE: AiuFormState = { status: "idle" };

const FIELD_CLASS = (hasError: boolean) =>
  [
    "mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
    hasError
      ? "border-destructive/30 focus:border-destructive focus:outline-destructive/30"
      : "border-border hover:border-foreground/20 focus:border-gold-500 focus:outline-gold-600/30",
  ].join(" ");

const AIU_FIELDS = [
  { name: "adminPct", label: "Administración (%)" },
  { name: "imprevPct", label: "Imprevistos (%)" },
  { name: "utilidadPct", label: "Utilidad (%)" },
  { name: "ivaUtilidadPct", label: "IVA sobre utilidad (%)" },
] as const;

type AiuFieldName = (typeof AIU_FIELDS)[number]["name"];
type AiuDraft = Record<AiuFieldName, string>;

/**
 * Modal de configuración del AIU. Los porcentajes se almacenan como
 * micro-fracción (100_000 = 10 %); aquí se editan como número legible y la
 * vista previa usa el MISMO motor `BigInt` del servidor.
 */
export default function AiuConfigModal({
  onClose,
  tenantSlug,
  projectId,
  defaults,
  directCostTotal,
}: {
  onClose: () => void;
  tenantSlug: string;
  projectId: string;
  defaults: AiuDraft;
  /** Costo directo actual en micro-pesos (string BigInt). */
  directCostTotal: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateAiuConfigAction,
    IDLE_STATE,
  );
  const router = useRouter();
  // El componente se monta solo cuando el modal está abierto, así que el
  // borrador se inicializa con los valores vigentes en cada apertura.
  const [draft, setDraft] = useState<AiuDraft>(defaults);

  useEffect(() => {
    if (state.status === "ok") {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const errors = state.errors ?? {};

  const preview = useMemo(() => {
    const admin = percentToMicro(draft.adminPct);
    const imprev = percentToMicro(draft.imprevPct);
    const utilidad = percentToMicro(draft.utilidadPct);
    const iva = percentToMicro(draft.ivaUtilidadPct);
    if (
      admin === null ||
      imprev === null ||
      utilidad === null ||
      iva === null
    ) {
      return null;
    }
    let direct: bigint;
    try {
      direct = BigInt(directCostTotal || "0");
    } catch {
      return null;
    }
    const totals = calculateBudgetTotals(direct, admin, imprev, utilidad, iva);
    return {
      admin: formatMoneyMicro(totals.adminTotal),
      imprev: formatMoneyMicro(totals.imprevTotal),
      utilidad: formatMoneyMicro(totals.utilidadTotal),
      iva: formatMoneyMicro(totals.ivaUtilidadTotal),
      total: formatMoneyMicro(totals.grandTotal),
    };
  }, [draft, directCostTotal]);

  return (
    <Modal
      open
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
      title="Configurar AIU"
    >
      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="projectId" value={projectId} />

        <div className="grid gap-4 sm:grid-cols-2">
          {AIU_FIELDS.map((field) => (
            <div key={field.name}>
              <label
                htmlFor={`aiu-${field.name}`}
                className="text-sm font-medium text-foreground/80"
              >
                {field.label}
              </label>
              <input
                id={`aiu-${field.name}`}
                name={field.name}
                inputMode="decimal"
                value={draft[field.name]}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.name]: event.target.value,
                  }))
                }
                placeholder="0"
                aria-invalid={Boolean(errors[field.name])}
                className={FIELD_CLASS(Boolean(errors[field.name]))}
              />
              {errors[field.name] ? (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors[field.name]}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
          <p className="font-medium text-foreground/80">Vista previa</p>
          {preview ? (
            <dl className="mt-2 space-y-1 text-muted-foreground">
              <div className="flex justify-between gap-4">
                <dt>Administración</dt>
                <dd className="font-mono text-foreground/80">
                  {preview.admin}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Imprevistos</dt>
                <dd className="font-mono text-foreground/80">
                  {preview.imprev}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Utilidad</dt>
                <dd className="font-mono text-foreground/80">
                  {preview.utilidad}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>IVA s/ utilidad</dt>
                <dd className="font-mono text-foreground/80">{preview.iva}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-1 text-foreground">
                <dt className="font-medium">Valor total</dt>
                <dd className="font-mono font-medium">{preview.total}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-muted-foreground">
              Ingresa porcentajes válidos para ver la proyección.
            </p>
          )}
        </div>

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
            {isPending ? "Guardando…" : "Guardar AIU"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
