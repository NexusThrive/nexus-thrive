"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, Plus, Settings2, SlidersHorizontal, Trash2 } from "lucide-react";
import { microToPercent } from "@/lib/apu-engine";
import { formatMoneyMicro, formatQuantityMicro } from "@/lib/format";
import { NLoader } from "@/components/brand/n-loader";
import type { ProjectBudgetData } from "@/lib/tenant-db";
import {
  deleteBudgetItemAction,
  deleteChapterAction,
  toggleBudgetLockAction,
} from "../budget/actions";
import ChapterModal from "./chapter-modal";
import ItemModal from "./item-modal";
import AiuConfigModal from "./aiu-config-modal";

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
}: {
  tenantSlug: string;
  projectId: string;
  budget: ProjectBudgetData;
}) {
  const [chapterOpen, setChapterOpen] = useState(false);
  const [aiuOpen, setAiuOpen] = useState(false);
  const [itemChapter, setItemChapter] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const router = useRouter();
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();

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
            onClick={() => setChapterOpen(true)}
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
              onClick={() => setChapterOpen(true)}
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
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => onDeleteItem(item.id)}
                                disabled={isDeleting}
                                aria-label={`Eliminar partida ${item.code || item.description}`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-rose-400 transition hover:bg-rose-400/10 disabled:opacity-50"
                              >
                                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                              </button>
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
        open={chapterOpen}
        onClose={() => setChapterOpen(false)}
        tenantSlug={tenantSlug}
        projectId={projectId}
      />

      {itemChapter ? (
        <ItemModal
          open={itemChapter !== null}
          onClose={() => setItemChapter(null)}
          tenantSlug={tenantSlug}
          projectId={projectId}
          chapterId={itemChapter.id}
          chapterLabel={itemChapter.label}
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
    </div>
  );
}
