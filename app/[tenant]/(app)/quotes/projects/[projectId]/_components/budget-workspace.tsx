"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Layers, Lock, LockOpen, Pencil, Plus, Settings2, SlidersHorizontal, Trash2 } from "lucide-react";
import { microToPercent } from "@/lib/apu-engine";
import { formatMoneyMicro, formatQuantityMicro } from "@/lib/format";
import { NLoader } from "@/components/brand/n-loader";
import { ToastProvider } from "@/components/brand/toast";
import type { BudgetBaselineData, ProjectBudgetData } from "@/lib/tenant-db";
import {
  approveBudgetBaselineAction,
  deleteBudgetItemAction,
  deleteChapterAction,
  toggleBudgetLockAction,
} from "../budget/actions";
import ChapterModal, { type EditableChapter } from "./chapter-modal";
import ItemModal, { type EditableBudgetItem } from "./item-modal";
import AiuConfigModal from "./aiu-config-modal";
import CatalogImportModal from "./catalog-import-modal";

/** Tarjeta KPI del resumen financiero del presupuesto. */
function KpiCard({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border bg-card p-4",
        strong ? "border-accent/40" : "border-border",
      ].join(" ")}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={[
          "mt-1 font-mono text-lg font-semibold tabular-nums",
          strong ? "text-accent-text" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Presupuestador APU & AIU (FASE 2 del vertical construcción — Tab 2).
 *
 * Muestra el resumen financiero (costo directo + cascada AIU), la estructura
 * jerárquica Presupuesto → Capítulos → Partidas y los modales de creación. El
 * servidor recalcula todos los totales; aquí solo se presentan los valores ya
 * serializados (micro-unidades como string).
 */
export default function BudgetWorkspace({
  tenantSlug,
  projectId,
  budget,
  baselines,
  canGovern,
}: {
  tenantSlug: string;
  projectId: string;
  budget: ProjectBudgetData;
  baselines: BudgetBaselineData[];
  canGovern: boolean;
}) {
  const [chapterOpen, setChapterOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<EditableChapter | null>(
    null,
  );
  const [aiuOpen, setAiuOpen] = useState(false);
  const [itemChapter, setItemChapter] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [importChapter, setImportChapter] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<{
    chapterId: string;
    chapterLabel: string;
    item: EditableBudgetItem;
  } | null>(null);

  const router = useRouter();
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [isApproving, startApprove] = useTransition();

  const totals = useMemo(() => {
    const adminImprev =
      BigInt(budget.adminTotal) + BigInt(budget.imprevTotal);
    const utilidadIva =
      BigInt(budget.utilidadTotal) + BigInt(budget.ivaUtilidadTotal);
    return {
      direct: formatMoneyMicro(budget.directCostTotal),
      adminImprev: formatMoneyMicro(adminImprev),
      utilidadIva: formatMoneyMicro(utilidadIva),
      grand: formatMoneyMicro(budget.grandTotal),
    };
  }, [budget]);

  const aiuDefaults = useMemo(
    () => ({
      adminPct: microToPercent(BigInt(budget.aiuAdminPct)),
      imprevPct: microToPercent(BigInt(budget.aiuImprevPct)),
      utilidadPct: microToPercent(BigInt(budget.aiuUtilidadPct)),
      ivaUtilidadPct: microToPercent(BigInt(budget.ivaUtilidadPct)),
    }),
    [budget],
  );

  const onToggleLock = () => {
    startToggle(async () => {
      await toggleBudgetLockAction(tenantSlug, projectId, !budget.isLocked);
      router.refresh();
    });
  };

  const onDeleteChapter = (chapterId: string) => {
    if (!window.confirm("¿Eliminar este capítulo y todas sus partidas?")) return;
    startDelete(async () => {
      const res = await deleteChapterAction(tenantSlug, projectId, chapterId);
      if (!res.ok) {
        window.alert(res.message ?? "No se pudo eliminar el capítulo.");
      }
      router.refresh();
    });
  };

  const onDeleteItem = (itemId: string) => {
    if (!window.confirm("¿Eliminar esta partida?")) return;
    startDelete(async () => {
      const res = await deleteBudgetItemAction(tenantSlug, projectId, itemId);
      if (!res.ok) {
        window.alert(res.message ?? "No se pudo eliminar la partida.");
      }
      router.refresh();
    });
  };

  const onApproveBaseline = () => {
    const note = window.prompt("Nota de la línea base (opcional):");
    if (note === null) return;
    startApprove(async () => {
      const res = await approveBudgetBaselineAction(
        tenantSlug,
        projectId,
        note.trim() ? note.trim() : undefined,
      );
      if (!res.ok) {
        window.alert(res.message ?? "No se pudo aprobar la línea base.");
      }
      router.refresh();
    });
  };

  const itemCount = budget.chapters.reduce(
    (total, chapter) => total + chapter.items.length,
    0,
  );

  return (
    <div className="space-y-5">
      {/* Resumen financiero */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Costo directo" value={totals.direct} />
        <KpiCard
          label="Admin + imprev"
          value={totals.adminImprev}
          hint={`Admin ${aiuDefaults.adminPct} % · Imprev ${aiuDefaults.imprevPct} %`}
        />
        <KpiCard
          label="Utilidad + IVA"
          value={totals.utilidadIva}
          hint={`Util ${aiuDefaults.utilidadPct} % · IVA ${aiuDefaults.ivaUtilidadPct} %`}
        />
        <KpiCard label="Valor total" value={totals.grand} strong />
      </div>

      {/* Línea base (D1) */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Línea base</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {baselines.length === 0
                ? "Sin línea base aprobada todavía."
                : `${baselines.length} ${
                    baselines.length === 1 ? "línea base" : "líneas base"
                  }; vigente v${baselines[0].version}.`}
            </p>
          </div>
          {canGovern ? (
            <button
              type="button"
              onClick={onApproveBaseline}
              disabled={isApproving}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 bg-card px-3 text-sm font-medium text-accent-text transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApproving ? (
                <NLoader size={14} className="text-current" />
              ) : (
                <BadgeCheck aria-hidden="true" className="h-4 w-4" />
              )}
              Aprobar línea base
            </button>
          ) : null}
        </div>
        {baselines.length > 0 ? (
          <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
            {baselines.map((baseline) => (
              <li
                key={baseline.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
              >
                <span className="font-mono font-medium text-accent-text">
                  v{baseline.version}
                </span>
                <span className="font-mono tabular-nums text-foreground">
                  {formatMoneyMicro(baseline.grandTotal)}
                </span>
                <span className="text-muted-foreground">
                  rev {baseline.budgetRevision} · {baseline.chapterCount} cap. ·{" "}
                  {baseline.itemCount} part.
                </span>
                <span className="text-muted-foreground">
                  {baseline.approvedByName} · {baseline.createdAt}
                </span>
                {baseline.note ? (
                  <span className="text-muted-foreground">— {baseline.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-medium text-accent-text">
            {budget.code}
          </span>
          <span className="text-xs text-muted-foreground">
            {budget.chapters.length}{" "}
            {budget.chapters.length === 1 ? "capítulo" : "capítulos"} ·{" "}
            {itemCount} {itemCount === 1 ? "partida" : "partidas"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAiuOpen(true)}
            disabled={budget.isLocked}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            Configurar AIU
          </button>
          <button
            type="button"
            onClick={onToggleLock}
            disabled={isToggling}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isToggling ? (
              <NLoader size={14} className="text-current" />
            ) : budget.isLocked ? (
              <LockOpen aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Lock aria-hidden="true" className="h-4 w-4" />
            )}
            {budget.isLocked ? "Desbloquear" : "Bloquear"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingChapter(null);
              setChapterOpen(true);
            }}
            disabled={budget.isLocked}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nuevo capítulo
          </button>
        </div>
      </div>

      {budget.isLocked ? (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          El presupuesto está bloqueado: no se pueden crear capítulos ni
          partidas. Desbloquéalo para editarlo.
        </div>
      ) : null}

      {/* Estructura jerárquica */}
      {budget.chapters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <Settings2
            aria-hidden="true"
            className="mx-auto h-6 w-6 text-muted-foreground"
          />
          <p className="mt-3 text-sm font-medium text-foreground">
            El presupuesto está vacío
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Crea el primer capítulo para empezar a desglosar las partidas de la
            obra. Los totales se recalculan automáticamente con cada partida.
          </p>
          {!budget.isLocked ? (
            <button
              type="button"
              onClick={() => {
              setEditingChapter(null);
              setChapterOpen(true);
            }}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Crear primer capítulo
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {budget.chapters.map((chapter) => (
            <section
              key={chapter.id}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <header className="flex flex-col gap-2 border-b border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    Capítulo {chapter.order}
                  </p>
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {chapter.name}
                  </h3>
                  {chapter.description ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {chapter.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {formatMoneyMicro(chapter.subtotal)}
                  </span>
                  {!budget.isLocked ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setImportChapter({
                            id: chapter.id,
                            label: `Capítulo ${chapter.order}`,
                          })
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                      >
                        <Layers aria-hidden="true" className="h-3.5 w-3.5" />
                        Importar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setItemChapter({
                            id: chapter.id,
                            label: `Capítulo ${chapter.order}`,
                          })
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                      >
                        <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                        Partida
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingChapter({
                            id: chapter.id,
                            name: chapter.name,
                            description: chapter.description ?? "",
                          })
                        }
                        aria-label={`Editar capítulo ${chapter.order}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                      >
                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteChapter(chapter.id)}
                        disabled={isDeleting}
                        aria-label={`Eliminar capítulo ${chapter.order}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-rose-400 transition hover:bg-rose-400/10 disabled:opacity-50"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : null}
                </div>
              </header>

              {chapter.items.length === 0 ? (
                <p className="px-4 py-4 text-xs text-muted-foreground">
                  Este capítulo no tiene partidas todavía.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Partida</th>
                        <th className="px-4 py-2 text-right font-medium">
                          Unidad
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Cantidad
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Costo unit.
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Total
                        </th>
                        {!budget.isLocked ? (
                          <th className="w-12 px-4 py-2" aria-label="Acciones" />
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {chapter.items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {item.code ? (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {item.code}
                                </span>
                              ) : null}
                              <span className="text-foreground">
                                {item.description}
                              </span>
                            </div>
                            {item.resources.length > 0 ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {item.resources.length} recursos (APU)
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                            {item.unit}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground/80">
                            {formatQuantityMicro(item.quantity)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground/80">
                            {formatMoneyMicro(item.unitCostDirect)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-medium tabular-nums text-foreground">
                            {formatMoneyMicro(item.totalCostDirect)}
                          </td>
                          {!budget.isLocked ? (
                            <td className="px-4 py-2">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingItem({
                                      chapterId: chapter.id,
                                      chapterLabel: `Capítulo ${chapter.order}`,
                                      item: {
                                        id: item.id,
                                        code: item.code,
                                        description: item.description,
                                        unit: item.unit,
                                        quantity: item.quantity,
                                        unitCost: item.unitCostDirect,
                                      },
                                    })
                                  }
                                  aria-label={`Editar partida ${item.code || item.description}`}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-foreground/70 transition hover:bg-muted disabled:opacity-50"
                                >
                                  <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteItem(item.id)}
                                  disabled={isDeleting}
                                  aria-label={`Eliminar partida ${item.code || item.description}`}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-rose-400 transition hover:bg-rose-400/10 disabled:opacity-50"
                                >
                                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <ChapterModal
        open={chapterOpen || editingChapter !== null}
        onClose={() => {
          setChapterOpen(false);
          setEditingChapter(null);
        }}
        tenantSlug={tenantSlug}
        projectId={projectId}
        expectedRevision={budget.revision}
        chapter={editingChapter ?? undefined}
      />

      {itemChapter || editingItem ? (
        <ItemModal
          open
          onClose={() => {
            setItemChapter(null);
            setEditingItem(null);
          }}
          tenantSlug={tenantSlug}
          projectId={projectId}
          chapterId={itemChapter?.id ?? editingItem?.chapterId ?? ""}
          chapterLabel={
            itemChapter?.label ?? editingItem?.chapterLabel ?? ""
          }
          expectedRevision={budget.revision}
          item={editingItem?.item}
        />
      ) : null}

      {aiuOpen ? (
        <AiuConfigModal
          onClose={() => setAiuOpen(false)}
          tenantSlug={tenantSlug}
          projectId={projectId}
          defaults={aiuDefaults}
          directCostTotal={budget.directCostTotal}
        />
      ) : null}

      {/* ToastProvider siempre montado: el toast de éxito sobrevive al cierre
          del modal de importación (el contenedor vive lo que el workspace). */}
      <ToastProvider>
        {importChapter ? (
          <CatalogImportModal
            tenantSlug={tenantSlug}
            projectId={projectId}
            chapterId={importChapter.id}
            chapterLabel={importChapter.label}
            expectedRevision={budget.revision}
            onClose={() => setImportChapter(null)}
          />
        ) : null}
      </ToastProvider>
    </div>
  );
}
