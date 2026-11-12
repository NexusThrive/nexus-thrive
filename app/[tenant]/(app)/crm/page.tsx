import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureStages, loadPipeline, type PipelineFilters } from "@/lib/business/growth/pipeline-db";
import { CRM_SECTION, crmSearchDefs } from "@/lib/business/growth/crm-search";
import { listSavedSearches } from "@/lib/core/tenancy/saved-searches-db";
import { applySearch, isAdvanced, paramsOfSnapshot, parseSearchState, toSchema, type SearchAlias } from "@/lib/foundation/list-search";
import { redirect } from "next/navigation";

/** Enlaces de antes: `?mios=0` equivale a «Todas». */
const MINE_ALIAS: SearchAlias = { param: "mios", map: { "0": "todas" } };
import { listOpportunities } from "@/lib/business/growth/opportunities-db";
import { pendingCrmActivities, pickerCustomer } from "@/lib/business/growth/pipeline-read";
import { bogotaMonth, filterPipelineCards, parseMoney } from "@/lib/business/growth/pipeline";
import { can } from "@/lib/core/auth/permissions";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import PipelineView, { type PipelineViewName } from "./_components/pipeline/pipeline-view";

export const metadata: Metadata = { title: "Pipeline" };

const VIEWS: readonly PipelineViewName[] = ["tablero", "lista", "calendario", "grafico", "actividades"];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * App CRM › Ventas: el pipeline de oportunidades (tablero, lista, calendario, gráfico y actividades). «Mis oportunidades» por defecto
 * (las mías y las que no tienen responsable); `?mios=0` las muestra todas. `?cliente=` filtra por un cliente (desde su ficha) y
 * `?nueva=1` abre la creación rápida. Antes vivía aquí la lista de oportunidades (`_components/opportunities-view.tsx`, sin usar).
 */
export default async function PipelinePage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { tenant } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(tenant, "/crm");
  if (!ctx) notFound();
  const view = (VIEWS as readonly string[]).includes(first(sp.vista)) ? (first(sp.vista) as PipelineViewName) : "tablero";
  const mine = first(sp.mios) !== "0";
  const customerId = first(sp.cliente) || undefined;
  const prioridad = Number(first(sp.prioridad));
  const filters: PipelineFilters = {
    me: ctx.memberId,
    mine,
    q: first(sp.q) || undefined,
    ownerId: first(sp.responsable) || undefined,
    tag: first(sp.etiqueta) || undefined,
    priority: prioridad >= 1 && prioridad <= 3 ? prioridad : undefined,
    closeFrom: first(sp.desde) || undefined,
    closeTo: first(sp.hasta) || undefined,
    valueMin: parseMoney(first(sp.min)) ?? undefined,
    valueMax: parseMoney(first(sp.max)) ?? undefined,
    customerId,
  };
  // Las etapas se aseguran una sola vez antes de las cargas en paralelo (si no, un negocio nuevo las crearía dos veces).
  await ensureStages(ctx.tenantId);
  // El tablero se carga una sola vez y los filtros se aplican sobre lo cargado (antes eran dos cargas completas).
  const [everything, lost, favorites] = await Promise.all([
    loadPipeline(ctx.tenantId),
    listOpportunities(ctx.tenantId, "LOST", 100),
    listSavedSearches(ctx.tenantId, ctx.memberId, CRM_SECTION),
  ]);
  const board = { ...everything, cards: filterPipelineCards(everything.cards, filters) };

  // Al entrar sin haber tocado la búsqueda se aplica el favorito por defecto (`v` marca que ya se tocó).
  const defaultFavorite = favorites.find((f) => f.isDefault);
  if (defaultFavorite && !sp.v && !["q", "en", "filtros", "regla", "mios"].some((key) => sp[key] !== undefined)) {
    const next = new URLSearchParams(paramsOfSnapshot(defaultFavorite.params));
    for (const [key, value] of Object.entries(sp)) if (typeof value === "string") next.set(key, value);
    next.set("v", "1");
    redirect(`/${tenant}/crm?${next.toString()}`);
  }

  // Búsqueda avanzada: se filtra en memoria sobre todas las oportunidades; sin ella rigen los filtros de siempre.
  const defs = crmSearchDefs({ me: ctx.memberId, owners: everything.owners, stages: everything.stages, tags: everything.tags });
  const urlParams = new URLSearchParams();
  for (const key of ["q", "en", "filtros", "regla", "mios"]) {
    const raw = sp[key];
    for (const value of Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]) urlParams.append(key, value);
  }
  const searchState = parseSearchState(urlParams, defs, MINE_ALIAS);
  const advanced = isAdvanced(searchState);
  const cards = advanced ? applySearch(everything.cards, defs, searchState).filter((c) => !customerId || c.customer?.id === customerId) : board.cards;
  const activities = view === "actividades" ? await pendingCrmActivities(ctx.tenantId, cards.map((c) => c.id)) : [];
  const customer = customerId ? await pickerCustomer(ctx.tenantId, customerId) : null;
  const month = /^\d{4}-\d{2}$/.test(first(sp.mes)) ? first(sp.mes) : bogotaMonth();
  const lostRows = lost.map((o) => ({ id: o.id, name: o.interest, customer: o.customerId ? o.customerName : null, value: o.estimatedValue ?? 0, reason: o.lostReason }));
  return (
    <PipelineView
      slug={tenant}
      view={view}
      stages={board.stages}
      cards={cards}
      schema={toSchema(defs)}
      favorites={favorites}
      lost={board.lost}
      lostRows={lostRows}
      activities={activities}
      month={month}
      customerName={customer?.name ?? null}
      preset={first(sp.nueva) === "1" ? customer : null}
      hasAny={everything.cards.length > 0 || everything.lost.count > 0}
      canConfig={can(ctx.role, "business.manage")}
    />
  );
}
