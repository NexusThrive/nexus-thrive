"use client";

import { apuImageUrl } from "@/lib/apu-images";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Search, Snowflake, X } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import { useToast } from "@/components/brand/toast";
import {
  APU_ITEM_CATEGORIES,
  APU_UNITS,
  formatApuUnit,
} from "@/lib/apu-engine";
import { formatCurrency, toNumber } from "@/lib/format";
import type {
  ApuActivityDetail,
  ApuActivityRow,
} from "@/lib/tenant-db";
import Modal from "@/components/construction/modal";
import {
  getCatalogActivityDetailAction,
  importActivityFromCatalogAction,
  searchCatalogActivitiesAction,
} from "../budget/actions";

const DEBOUNCE_MS = 250;

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-border-strong focus:border-accent focus:outline-2 focus:outline-accent/30";

/**
 * Importador de actividades del catálogo APU al presupuesto.
 *
 * Busca en vivo actividades vigentes del mismo tenant, previsualiza su
 * composición y las importa como partida con **precios congelados** (snapshot
 * inmutable: `sourceActivityId` / `sourceItemId` conservan la trazabilidad).
 *
 * El presupuesto se deriva del proyecto; la cantidad por defecto es 1.
 */
export default function CatalogImportModal({
  tenantSlug,
  projectId,
  chapterId,
  chapterLabel,
  expectedRevision,
  onClose,
}: {
  tenantSlug: string;
  projectId: string;
  chapterId: string;
  chapterLabel: string;
  expectedRevision: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("");
  const [results, setResults] = useState<ApuActivityRow[] | null>(null);
  const [isSearching, startSearch] = useTransition();
  const searchSeq = useRef(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApuActivityDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const detailSeq = useRef(0);

  const [quantity, setQuantity] = useState("1");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spinner mientras la primera búsqueda no llega o una nueva está en vuelo.
  const searching = isSearching || results === null;

  // Búsqueda con debounce; la última consulta gana (token de secuencia).
  useEffect(() => {
    const seq = ++searchSeq.current;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const rows = await searchCatalogActivitiesAction(
          tenantSlug,
          query,
          unit || undefined,
        );
        if (seq !== searchSeq.current) {
          return;
        }
        setResults(rows ?? []);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, unit, tenantSlug]);

  const select = async (activity: ApuActivityRow) => {
    setSelectedId(activity.id);
    setDetail(null);
    setError(null);
    setLoadingDetail(true);
    const seq = ++detailSeq.current;
    const found = await getCatalogActivityDetailAction(tenantSlug, activity.id);
    if (seq !== detailSeq.current) {
      return;
    }
    setDetail(found);
    setLoadingDetail(false);
  };

  const onImport = async () => {
    if (!selectedId) {
      return;
    }
    setImporting(true);
    setError(null);
    const res = await importActivityFromCatalogAction(
      tenantSlug,
      projectId,
      chapterId,
      selectedId,
      quantity,
      expectedRevision,
    );
    setImporting(false);
    if (!res.ok) {
      setError(res.message ?? "No se pudo importar la actividad.");
      return;
    }
    toast("Actividad importada al presupuesto con precios congelados.", "success");
    onClose();
    router.refresh();
  };

  const grouped = useMemo(() => {
    if (!detail) {
      return [];
    }
    // Por sección de la línea (como en el APU del catálogo); las líneas sin
    // sección se agrupan por la categoría del insumo.
    const groups: { key: string; label: string; rows: typeof detail.compositions }[] = [];
    for (const row of detail.compositions) {
      const label =
        (row.section ?? "").replace(/:\s*$/, "") ||
        (APU_ITEM_CATEGORIES.find((category) => category.value === row.category)?.label ?? "Otros");
      let group = groups.find((entry) => entry.label === label);
      if (!group) {
        group = { key: `${groups.length}-${label}`, label, rows: [] };
        groups.push(group);
      }
      group.rows.push(row);
    }
    return groups;
  }, [detail]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Importar desde el catálogo · ${chapterLabel}`}
      wide
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Panel de búsqueda */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              role="searchbox"
              aria-label="Buscar actividades del catálogo"
              placeholder="Buscar por código o nombre…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${inputClass} pr-9 pl-9`}
              autoFocus
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {searching ? (
                <NLoader size={16} className="text-current" />
              ) : query ? (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setQuery("")}
                  className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              ) : null}
            </span>
          </div>

          <div>
            <label
              htmlFor="catalog-unit-filter"
              className="text-xs font-medium text-muted-foreground"
            >
              Filtrar por unidad
            </label>
            <select
              id="catalog-unit-filter"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className={`${inputClass} mt-1`}
            >
              <option value="">Todas las unidades</option>
              {APU_UNITS.map((option) => (
                <option key={option} value={option}>
                  {formatApuUnit(option)}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[22rem] overflow-y-auto rounded-lg border border-border">
            {results === null || results.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                {searching
                  ? "Buscando actividades…"
                  : "No hay actividades que coincidan con la búsqueda."}
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {results.map((activity) => {
                  const active = activity.id === selectedId;
                  return (
                    <li key={activity.id}>
                      <button
                        type="button"
                        onClick={() => select(activity)}
                        aria-pressed={active}
                        className={`flex w-full flex-col gap-1 px-4 py-2.5 text-left transition ${
                          active ? "bg-accent/10" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {activity.code ? (
                            <span className="font-mono text-xs text-muted-foreground">
                              {activity.code}
                            </span>
                          ) : null}
                          <span className="truncate text-sm text-foreground">
                            {activity.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatApuUnit(activity.unit)}</span>
                          <span className="font-mono tabular-nums">
                            {formatCurrency(activity.unitCost)}
                          </span>
                          <span>
                            {activity.itemCount}{" "}
                            {activity.itemCount === 1 ? "insumo" : "insumos"}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Panel de previsualización */}
        <div className="flex min-w-0 flex-col gap-3">
          {!selectedId ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center">
              <Search
                aria-hidden="true"
                className="h-6 w-6 text-muted-foreground"
              />
              <p className="mt-3 text-sm font-medium text-foreground">
                Elegí una actividad
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Vas a ver su composición APU antes de importarla al capítulo.
              </p>
            </div>
          ) : loadingDetail ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6">
              <NLoader size={32} />
              <p className="mt-3 text-xs text-muted-foreground">
                Cargando composición…
              </p>
            </div>
          ) : !detail ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-lg border border-dashed border-danger/40 bg-card p-6 text-center">
              <p className="text-sm font-medium text-danger">
                No se pudo cargar la composición
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Elegí otra actividad o cerrá el importador e intentá de nuevo.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    {detail.code ? (
                      <p className="font-mono text-xs text-muted-foreground">
                        {detail.code}
                      </p>
                    ) : null}
                    <h3 className="text-sm font-semibold text-foreground">
                      {detail.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Unidad {formatApuUnit(detail.unit)} · {detail.itemCount}{" "}
                      {detail.itemCount === 1 ? "insumo" : "insumos"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Costo unit.</p>
                    <p className="font-mono text-sm font-medium tabular-nums text-accent-text">
                      {formatCurrency(detail.unitCost)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2">
                  <Snowflake
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-accent-text"
                  />
                  <p className="text-xs text-foreground">
                    Precios se congelarán al importar: la partida no cambiará
                    aunque el catálogo se actualice después.
                  </p>
                </div>
              </div>

              <div className="max-h-[18rem] space-y-3 overflow-y-auto">
                {grouped.map((group) => (
                  <div key={group.key}>
                    <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </div>
                    <ul className="divide-y divide-border/60 rounded-lg border border-border">
                      {group.rows.map((row) => (
                        <li
                          key={row.id}
                          className="flex items-center justify-between gap-3 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {row.imageId ? (
                              // eslint-disable-next-line @next/next/no-img-element -- foto servida por la API propia
                              <img src={apuImageUrl(row.imageId)!} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded border border-border bg-card object-contain" />
                            ) : null}
                            <div className="min-w-0">
                              <p className="truncate text-xs text-foreground">
                                {row.itemName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {row.lineUnit?.trim().startsWith("%")
                                  ? `${row.lineQuantity ?? ""} % sobre ${formatCurrency(row.unitPrice)}`
                                  : `Rend. ${toNumber(row.consumption)} · desp. ${toNumber(row.wastePercent)}% · ${formatCurrency(row.unitPrice)}`}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-xs tabular-nums text-foreground/80">
                            {formatCurrency(row.cost)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}

          {error ? (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          ) : null}

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3">
            <div className="w-32">
              <label
                htmlFor="catalog-import-quantity"
                className="text-xs font-medium text-muted-foreground"
              >
                Cantidad
              </label>
              <input
                id="catalog-import-quantity"
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className={`${inputClass} mt-1 font-mono tabular-nums`}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={importing}
                className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onImport}
                disabled={!selectedId || importing}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? (
                  <NLoader size={16} className="text-current" />
                ) : (
                  <Lock aria-hidden="true" className="h-4 w-4" />
                )}
                Importar partida
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
