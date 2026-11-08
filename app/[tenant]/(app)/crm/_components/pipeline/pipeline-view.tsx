"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChartColumn, ChevronDown, Clock, Columns3, List, MoreVertical, Search, X } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { DateInput } from "@/components/molecules/date-input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { Field } from "@/components/molecules/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/molecules/popover";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { completeActivityAction, moveStageAction, reopenAction, reorderAction } from "@/app/[tenant]/(app)/crm/pipeline-actions";
import { createStageAction, setStageOrderAction, updateStageAction } from "@/app/[tenant]/(app)/crm/configuracion/actions";
import type { PipelineCard, PipelineStage } from "@/lib/business/growth/pipeline-db";
import type { PickerCustomer } from "@/lib/business/growth/pipeline-read";
import { shortMoney } from "@/lib/business/growth/pipeline";
import { cn } from "@/lib/utils";
import { Board } from "./board";
import { ActivitiesView, CalendarView, ChartView, ListView, type ActivityItem } from "./views";

export type PipelineViewName = "tablero" | "lista" | "calendario" | "grafico" | "actividades";
type LostRow = { id: string; name: string; customer: string | null; value: number; reason: string | null };

const VIEWS: { key: PipelineViewName; label: string; icon: typeof List }[] = [
  { key: "tablero", label: "Tablero", icon: Columns3 },
  { key: "lista", label: "Lista", icon: List },
  { key: "calendario", label: "Calendario", icon: CalendarDays },
  { key: "grafico", label: "Gráfico", icon: ChartColumn },
  { key: "actividades", label: "Actividades", icon: Clock },
];

type Optimistic = { type: "move"; id: string; stage: PipelineStage } | { type: "order"; ids: string[] };

/**
 * App CRM › Ventas: el pipeline. Panel de control (Nueva oportunidad, Pipeline y ⋮; buscador con «Mis oportunidades» y filtros; vistas)
 * y la vista elegida. Mover y reordenar son optimistas: la tarjeta cambia al soltarla y, si el servidor lo rechaza, vuelve sola.
 * Filtros, búsqueda y vista viven en la URL (la lista y las demás vistas conservan los mismos filtros).
 */
export default function PipelineView({
  slug,
  view,
  stages,
  cards,
  lost,
  lostRows,
  owners,
  tags,
  activities,
  month,
  mine,
  customerName,
  preset,
  hasAny,
  canConfig = false,
}: {
  /** Quien gobierna el negocio crea, renombra y reordena etapas desde el tablero (como en Configuración). */
  canConfig?: boolean;
  slug: string;
  view: PipelineViewName;
  stages: PipelineStage[];
  cards: PipelineCard[];
  lost: { count: number; total: number };
  lostRows: LostRow[];
  owners: { id: string; name: string }[];
  tags: string[];
  activities: ActivityItem[];
  month: string;
  mine: boolean;
  customerName: string | null;
  /** Cliente ya elegido en la creación rápida (al llegar desde su ficha con «Nueva oportunidad»). */
  preset?: PickerCustomer | null;
  /** ¿El negocio tiene alguna oportunidad (sin filtros)? Si no, el tablero invita a crear la primera. */
  hasAny: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { toast } = useToast();
  const [, start] = useTransition();
  const [quickStage, setQuickStage] = useState<string | null>(params.get("nueva") === "1" ? "first" : null);
  const [showLost, setShowLost] = useState(false);
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const [doneIds, setDoneIds] = useState<ReadonlySet<string>>(new Set());
  const [q, setQ] = useState(params.get("q") ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const [now] = useState(() => Date.now());

  const [shown, apply] = useOptimistic(cards, (state: PipelineCard[], action: Optimistic) => {
    if (action.type === "move") return state.map((c) => (c.id === action.id ? { ...c, stageId: action.stage.id, probability: action.stage.probability, won: action.stage.isWon, position: null, next: action.stage.isWon ? null : c.next } : c));
    const rank = new Map(action.ids.map((id, i) => [id, i + 1]));
    return state.map((c) => (rank.has(c.id) ? { ...c, position: rank.get(c.id)! } : c)).sort((a, b) => (a.stageId === b.stageId && rank.has(a.id) && rank.has(b.id) ? rank.get(a.id)! - rank.get(b.id)! : 0));
  });

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("nueva");
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  // El buscador filtra al dejar de escribir (nombre, cliente, etiqueta y responsable).
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = window.setTimeout(() => setParams({ q: q.trim() || null }), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia lo escrito
  }, [q]);

  // N abre la creación rápida (fuera de los campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.closest("[role=dialog]"))) return;
      e.preventDefault();
      if (view !== "tablero") setParams({ vista: null });
      setQuickStage("first");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setParams lee la URL vigente
  }, [view, params]);

  const mark = (id: string, on: boolean) => setSaving((s) => {
    const n = new Set(s);
    if (on) n.add(id);
    else n.delete(id);
    return n;
  });

  const move = (card: PipelineCard, stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;
    mark(card.id, true);
    start(async () => {
      apply({ type: "move", id: card.id, stage });
      const r = await moveStageAction(slug, card.id, stageId);
      mark(card.id, false);
      toast(r.ok ? (r.message ?? "Etapa actualizada") : r.message, r.ok ? "success" : "error");
      router.refresh();
    });
  };

  const reorder = (_stageId: string, ids: string[]) => {
    start(async () => {
      apply({ type: "order", ids });
      const r = await reorderAction(slug, ids);
      if (!r.ok) toast(r.message, "error");
      router.refresh();
    });
  };

  const filtersOn = ["responsable", "etiqueta", "prioridad", "desde", "hasta", "min", "max"].some((k) => params.get(k));

  return (
    <div data-bleed="" className="flex flex-col">
      {/* Panel de control: 3 zonas */}
      {/* Por ancho: celular = acciones, buscador y vistas (a todo el ancho); 640–1100 = acciones y vistas arriba, buscador abajo; ≥ 1100 = 3 zonas. */}
      <div className="grid items-center gap-x-4 gap-y-3 px-5 py-4 [grid-template-areas:'left'_'search'_'views'] sm:grid-cols-[1fr_auto] sm:[grid-template-areas:'left_views'_'search_search'] min-[1100px]:grid-cols-[1fr_minmax(0,543px)_1fr] min-[1100px]:[grid-template-areas:'left_search_views']">
        <div className="flex min-w-0 items-center gap-3 [grid-area:left]">
          <button type="button" onClick={() => (view === "tablero" ? setQuickStage("first") : (setParams({ vista: null }), setQuickStage("first")))} className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px] font-semibold" })}>
            Nueva oportunidad
          </button>
          <h1 className="truncate text-lg font-medium text-foreground">Pipeline</h1>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Más acciones" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              <MoreVertical aria-hidden="true" className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setShowLost(true)}>Ver oportunidades perdidas</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${slug}/crm/configuracion#etapas`}>Configurar etapas</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${slug}/data`}>Importar contactos</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div suppressHydrationWarning className="flex h-9 w-full min-w-0 items-center gap-2 justify-self-center rounded-[10px] border border-border bg-card ps-3 [grid-area:search] focus-within:border-accent min-[1100px]:max-w-[543px]">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          {mine ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-surface-muted px-2 py-[3px] text-xs text-foreground">
              Mis oportunidades
              <button type="button" aria-label="Quitar filtro: Mis oportunidades" onClick={() => setParams({ mios: "0" })} className="text-muted-foreground hover:text-foreground">
                <X aria-hidden="true" className="size-3" />
              </button>
            </span>
          ) : null}
          {customerName ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-surface-muted px-2 py-[3px] text-xs text-foreground">
              {customerName}
              <button type="button" aria-label={`Quitar filtro: ${customerName}`} onClick={() => setParams({ cliente: null })} className="text-muted-foreground hover:text-foreground">
                <X aria-hidden="true" className="size-3" />
              </button>
            </span>
          ) : null}
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar oportunidades" placeholder="Buscar…" className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          <FilterMenu owners={owners} tags={tags} params={params} active={filtersOn} onApply={setParams} mine={mine} />
        </div>

        <div className="flex items-center justify-end [grid-area:views]">
          <div role="group" aria-label="Vistas" className="flex w-full gap-0.5 rounded-[10px] border border-border bg-card p-[3px] sm:w-auto">
            {VIEWS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={view === key}
                onClick={() => setParams({ vista: key === "tablero" ? null : key })}
                className={cn("grid h-[30px] flex-1 place-items-center rounded-[7px] outline-none focus-visible:outline-2 focus-visible:outline-ring sm:w-[34px] sm:flex-none", view === key ? "bg-surface-muted text-accent-text" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground")}
              >
                <Icon aria-hidden="true" className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "tablero" ? (
        <Board
          slug={slug}
          stages={stages}
          cards={shown}
          lost={lost}
          now={now}
          savingIds={saving}
          quickStage={quickStage}
          preset={preset ?? null}
          empty={!hasAny && !quickStage}
          onQuick={setQuickStage}
          onMove={move}
          onReorder={reorder}
          onShowLost={() => setShowLost(true)}
          canConfig={canConfig}
          onCreateStage={async (name, probability, afterId) => {
            const r = await createStageAction(slug, name, probability, afterId);
            toast(r.ok ? (r.message ?? "Etapa creada") : r.message, r.ok ? "success" : "error");
            if (r.ok) router.refresh();
            return r.ok;
          }}
          onRenameStage={(stage, name) =>
            start(async () => {
              const r = await updateStageAction(slug, stage.id, { name });
              toast(r.ok ? "Etapa renombrada" : r.message, r.ok ? "success" : "error");
              router.refresh();
            })
          }
          onReorderStages={(ids) =>
            start(async () => {
              const r = await setStageOrderAction(slug, ids);
              toast(r.ok ? "Orden de etapas guardado" : r.message, r.ok ? "success" : "error");
              router.refresh();
            })
          }
        />
      ) : view === "lista" ? (
        <ListView slug={slug} cards={shown} stages={stages} now={now} />
      ) : view === "calendario" ? (
        <CalendarView slug={slug} cards={shown} now={now} month={month} monthHref={(m) => `${pathname}?${new URLSearchParams({ ...Object.fromEntries(params.entries()), mes: m }).toString()}`} />
      ) : view === "grafico" ? (
        <ChartView cards={shown} stages={stages} />
      ) : (
        <ActivitiesView
          slug={slug}
          now={now}
          items={activities.filter((a) => !doneIds.has(a.id))}
          pendingIds={saving}
          onDone={(id) => {
            mark(id, true);
            start(async () => {
              const r = await completeActivityAction(slug, id);
              mark(id, false);
              if (r.ok) setDoneIds((s) => new Set(s).add(id));
              toast(r.ok ? "Actividad hecha. Programa la siguiente desde la oportunidad." : r.message, r.ok ? "success" : "error");
              router.refresh();
            });
          }}
        />
      )}

      <ResponsiveSheet open={showLost} onOpenChange={setShowLost} drawer title="Oportunidades perdidas" description={`${lost.count} · ${shortMoney(lost.total)}`} unsavedGuard={false}>
        {lostRows.length ? (
          <ul className="divide-y divide-border/60">
            {lostRows.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-3">
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <Link href={`/${slug}/crm/oportunidades/${o.id}`} className="truncate text-sm font-medium text-foreground hover:text-accent-text">
                    {o.name}
                  </Link>
                  <span className="truncate text-xs text-muted-foreground">{[o.customer, shortMoney(o.value), o.reason].filter(Boolean).join(" · ")}</span>
                </span>
                <button
                  type="button"
                  disabled={saving.has(o.id)}
                  onClick={() => {
                    mark(o.id, true);
                    start(async () => {
                      const r = await reopenAction(slug, o.id);
                      mark(o.id, false);
                      toast(r.ok ? (r.message ?? "Reabierta") : r.message, r.ok ? "success" : "error");
                      router.refresh();
                    });
                  }}
                  className="h-8 shrink-0 rounded-lg border border-border px-3 text-xs text-foreground hover:border-accent disabled:opacity-60"
                >
                  Reabrir
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No hay oportunidades perdidas.</p>
        )}
      </ResponsiveSheet>
    </div>
  );
}

/** Desplegable de filtros: responsable, etiqueta, prioridad, rango de cierre y valor (viven en la URL). */
function FilterMenu({ owners, tags, params, active, mine, onApply }: { owners: { id: string; name: string }[]; tags: string[]; params: URLSearchParams | ReturnType<typeof useSearchParams>; active: boolean; mine: boolean; onApply: (p: Record<string, string | null>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label="Filtros" className={cn("grid h-full w-9 shrink-0 place-items-center rounded-e-[10px] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", active ? "text-accent-text" : "text-muted-foreground")}>
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const get = (k: string) => String(f.get(k) ?? "").trim() || null;
            onApply({ responsable: get("responsable"), etiqueta: get("etiqueta"), prioridad: get("prioridad"), desde: get("desde"), hasta: get("hasta"), min: get("min"), max: get("max"), mios: f.get("mios") ? null : "0" });
            setOpen(false);
          }}
        >
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="mios" defaultChecked={mine} className="size-4 accent-[var(--accent)]" />
            Mis oportunidades
          </label>
          <Field label="Responsable">
            {(c) => (
              <Select {...c} name="responsable" defaultValue={params.get("responsable") ?? ""}>
                <option value="">Todos</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Etiqueta">
              {(c) => (
                <Select {...c} name="etiqueta" defaultValue={params.get("etiqueta") ?? ""}>
                  <option value="">Todas</option>
                  {tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Prioridad">
              {(c) => (
                <Select {...c} name="prioridad" defaultValue={params.get("prioridad") ?? ""}>
                  <option value="">Cualquiera</option>
                  <option value="1">★ o más</option>
                  <option value="2">★★ o más</option>
                  <option value="3">★★★</option>
                </Select>
              )}
            </Field>
            <Field label="Cierre desde">{(c) => <DateInput {...c} name="desde" defaultValue={params.get("desde") ?? ""} />}</Field>
            <Field label="Cierre hasta">{(c) => <DateInput {...c} name="hasta" defaultValue={params.get("hasta") ?? ""} />}</Field>
            <Field label="Valor mínimo">{(c) => <input {...c} inputMode="numeric" name="min" defaultValue={params.get("min") ?? ""} placeholder="$ 0" className={inputClasses} />}</Field>
            <Field label="Valor máximo">{(c) => <input {...c} inputMode="numeric" name="max" defaultValue={params.get("max") ?? ""} placeholder="Sin límite" className={inputClasses} />}</Field>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                onApply({ responsable: null, etiqueta: null, prioridad: null, desde: null, hasta: null, min: null, max: null });
                setOpen(false);
              }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border")}
            >
              Limpiar
            </button>
            <button type="submit" className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px] font-semibold" })}>
              Aplicar
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
