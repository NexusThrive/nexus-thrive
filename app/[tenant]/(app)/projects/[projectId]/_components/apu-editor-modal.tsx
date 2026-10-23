"use client";

import { apuImageUrl } from "@/lib/construction/apu-images";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Check } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { useToast } from "@/components/molecules/toast";
import {
  APU_ITEM_CATEGORIES,
  calculateItemTotal,
  formatApuUnit,
  microToPercent,
  parseMoney,
  percentToMicro,
  resourceLineCostMicro,
  type ApuItemCategoryValue,
  type ResourceTypeValue,
} from "@/lib/construction/apu-engine";
import { formatMoneyMicro, formatQuantityMicro } from "@/lib/format";
import type { BudgetItemData, BudgetResourceData } from "@/lib/tenant/db";
import Modal from "@/components/organisms/modal";
import { ApuCategoryBadge } from "@/components/molecules/quote-badges";
import { updateResourceAction } from "../budget/actions";
import { fieldClasses } from "@/components/atoms/input";
import { buttonVariants } from "@/components/atoms/button-variants";

/**
 * Mapeo del tipo de recurso almacenado al bloque de presentación del
 * compositor (Materiales / Mano de obra / Equipos / Transporte).
 */
const RESOURCE_TO_CATEGORY: Record<
  ResourceTypeValue,
  ApuItemCategoryValue
> = {
  MATERIAL: "MATERIAL",
  LABOR: "MANO_DE_OBRA",
  EQUIPMENT: "EQUIPO",
  TRANSPORT: "TRANSPORTE",
  OTHER: "OTRO",
  SUBCONTRACT: "SUBCONTRATO",
};

const inputClass =
  `${fieldClasses} h-9 px-2`;

/** Estado editable de una línea de APU (strings legibles para los inputs). */
type RowState = {
  performance: string;
  wastePct: string;
  savedPerformance: string;
  savedWastePct: string;
};

function initialRows(resources: BudgetResourceData[]): Record<string, RowState> {
  const map: Record<string, RowState> = {};
  for (const resource of resources) {
    const performance = formatQuantityMicro(resource.performance);
    const wastePct = microToPercent(BigInt(resource.wastePct));
    map[resource.id] = {
      performance,
      wastePct,
      savedPerformance: performance,
      savedWastePct: wastePct,
    };
  }
  return map;
}

/**
 * Costo de una línea con los valores editados (micro-unidades). Devuelve
 * `null` si el rendimiento o el desperdicio no son válidos todavía.
 */
function rowCostMicro(row: RowState, unitPrice: string): bigint | null {
  const performance = parseMoney(row.performance);
  const wastePct = percentToMicro(row.wastePct);
  if (performance === null || wastePct === null) {
    return null;
  }
  if (performance <= BigInt(0) || wastePct < BigInt(0)) {
    return null;
  }
  try {
    return resourceLineCostMicro({
      performance,
      wastePct,
      unitPrice: BigInt(unitPrice),
    });
  } catch {
    return null;
  }
}

/**
 * Compositor interactivo de APU de una partida del presupuesto.
 *
 * Lee la composición real (`BudgetItemResource[]`) agrupada en cuatro bloques
 * y permite editar el **rendimiento** y el **% de desperdicio** de cada línea.
 * El subtotal por línea y el costo unitario directo se recalculan en vivo con
 * la aritmética de punto fijo del motor; cada edición se persiste al salir del
 * campo (`updateResourceAction`) y refresca los totales del presupuesto.
 */
export default function ApuEditorModal({
  tenantSlug,
  projectId,
  item,
  expectedRevision,
  onClose,
}: {
  tenantSlug: string;
  projectId: string;
  item: BudgetItemData;
  expectedRevision: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    initialRows(item.resources),
  );
  const [revision, setRevision] = useState(expectedRevision);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quantity = useMemo(() => BigInt(item.quantity), [item.quantity]);

  // Agrupa por la sección del APU del catálogo, en su orden. Los recursos
  // sin sección (partidas creadas a mano) se agrupan por su tipo.
  const groups = useMemo(() => {
    const result: {
      key: string;
      label: string;
      category: ApuItemCategoryValue;
      resources: typeof item.resources;
    }[] = [];
    for (const resource of item.resources) {
      const category = RESOURCE_TO_CATEGORY[resource.type];
      const label =
        (resource.section ?? "").replace(/:\s*$/, "") ||
        (APU_ITEM_CATEGORIES.find((entry) => entry.value === category)?.label ?? "Otros");
      let group = result.find((entry) => entry.label === label);
      if (!group) {
        group = { key: `${result.length}-${label}`, label, category, resources: [] };
        result.push(group);
      }
      group.resources.push(resource);
    }
    return result;
  }, [item.resources]);

  // Vista previa en vivo del costo directo (Σ de líneas) y del total partida.
  const preview = useMemo(() => {
    let unitCostDirect = BigInt(0);
    let hasInvalid = false;
    for (const resource of item.resources) {
      const row = rows[resource.id];
      const cost = row ? rowCostMicro(row, resource.unitPrice) : null;
      if (cost === null) {
        hasInvalid = true;
        continue;
      }
      unitCostDirect += cost;
    }
    return {
      unitCostDirect,
      total: calculateItemTotal(quantity, unitCostDirect),
      hasInvalid,
    };
  }, [item.resources, rows, quantity]);

  const updateRow = (resourceId: string, patch: Partial<RowState>) => {
    setRows((prev) => {
      const current = prev[resourceId];
      if (!current) {
        return prev;
      }
      return { ...prev, [resourceId]: { ...current, ...patch } };
    });
  };

  const saveRow = (resource: BudgetResourceData) => {
    const row = rows[resource.id];
    if (!row) {
      return;
    }
    if (
      row.performance === row.savedPerformance &&
      row.wastePct === row.savedWastePct
    ) {
      return;
    }
    if (rowCostMicro(row, resource.unitPrice) === null) {
      setError(
        "Revisá el rendimiento (mayor a cero) y el desperdicio (0 a 100 %).",
      );
      return;
    }

    setError(null);
    setSavingId(resource.id);
    void (async () => {
      const result = await updateResourceAction(
        tenantSlug,
        projectId,
        resource.id,
        row.performance,
        row.wastePct,
        revision,
      );
      setSavingId(null);

      if (!result.ok) {
        setError(result.message ?? "No se pudo guardar la línea.");
        toast(result.message ?? "No se pudo guardar la línea.", "error");
        return;
      }
      if (typeof result.revision === "number") {
        setRevision(result.revision);
      }
      updateRow(resource.id, {
        savedPerformance: row.performance,
        savedWastePct: row.wastePct,
      });
      toast("Línea de APU actualizada.", "success");
      router.refresh();
    })();
  };

  const title = item.description
    ? `Compositor APU · ${item.description}`
    : "Compositor APU";

  return (
    <Modal open onClose={onClose} title={title} wide>
      {/* Encabezado de la partida */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div className="min-w-0">
          {item.code ? (
            <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
          ) : null}
          <h3 className="text-sm font-semibold text-foreground">
            {item.description}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Unidad {formatApuUnit(item.unit)} · Cantidad{" "}
            {formatQuantityMicro(item.quantity)} ·{" "}
            {item.resources.length}{" "}
            {item.resources.length === 1 ? "recurso" : "recursos"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Costo unit. directo</p>
          <p className="font-mono text-sm font-medium tabular-nums text-accent-text">
            {formatMoneyMicro(preview.unitCostDirect)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Editá el rendimiento y el % de desperdicio de cada insumo; los cambios se
        guardan al salir del campo.
      </p>

      {/* Bloques de composición */}
      {groups.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-border bg-card p-6 text-center">
          <Boxes aria-hidden="true" className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">
            Esta partida no tiene composición APU
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Importá una actividad del catálogo para desglosar sus materiales,
            mano de obra, equipos y transporte.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-1.5 flex items-center gap-2">
                <ApuCategoryBadge category={group.category} />
                <span className="text-xs font-medium text-foreground/80">{group.label}</span>
                <span className="text-xs text-muted-foreground">
                  {group.resources.length}{" "}
                  {group.resources.length === 1 ? "insumo" : "insumos"}
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Insumo</th>
                      <th className="w-28 px-3 py-2 text-right font-medium">
                        Rend.
                      </th>
                      <th className="w-24 px-3 py-2 text-right font-medium">
                        Desp. %
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Precio unit.
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.resources.map((resource) => {
                      const row = rows[resource.id];
                      const cost = row
                        ? rowCostMicro(row, resource.unitPrice)
                        : null;
                      const saving = savingId === resource.id;
                      return (
                        <tr
                          key={resource.id}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {resource.imageId ? (
                                // eslint-disable-next-line @next/next/no-img-element -- foto servida por la API propia
                                <img src={apuImageUrl(resource.imageId)!} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded border border-border bg-card object-contain" />
                              ) : null}
                              <span className="truncate text-foreground">
                                {resource.name}
                              </span>
                              {saving ? (
                                <NLoader size={12} className="shrink-0" />
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatApuUnit(resource.unit) || "—"}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Rendimiento de ${resource.name}`}
                              value={row?.performance ?? ""}
                              onChange={(event) =>
                                updateRow(resource.id, {
                                  performance: event.target.value,
                                })
                              }
                              onBlur={() => saveRow(resource)}
                              className={`${inputClass} text-right font-mono tabular-nums`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Desperdicio de ${resource.name}`}
                              value={row?.wastePct ?? ""}
                              onChange={(event) =>
                                updateRow(resource.id, {
                                  wastePct: event.target.value,
                                })
                              }
                              onBlur={() => saveRow(resource)}
                              className={`${inputClass} text-right font-mono tabular-nums`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                            {formatMoneyMicro(resource.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                            {cost === null ? "—" : formatMoneyMicro(cost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {/* Pie: total de la partida + acción de cierre */}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Costo unit. directo</p>
            <p className="font-mono text-sm font-medium tabular-nums text-foreground">
              {formatMoneyMicro(preview.unitCostDirect)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Total ({formatQuantityMicro(item.quantity)} ×)
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-accent-text">
              {formatMoneyMicro(preview.total)}
            </p>
          </div>
          {preview.hasInvalid ? (
            <p className="text-xs text-muted-foreground">
              Hay líneas con valores inválidos.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={buttonVariants({ size: "sm" })}
        >
          <Check aria-hidden="true" className="h-4 w-4" />
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
