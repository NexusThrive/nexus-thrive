import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureStages, loadPipeline, type PipelineFilters } from "@/lib/business/growth/pipeline-db";
import { listOpportunities } from "@/lib/business/growth/opportunities-db";
import { pendingCrmActivities, pickerCustomer } from "@/lib/business/growth/pipeline-read";
import { bogotaMonth, parseMoney } from "@/lib/business/growth/pipeline";
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
  const [board, everything, lost] = await Promise.all([loadPipeline(ctx.tenantId, filters), loadPipeline(ctx.tenantId), listOpportunities(ctx.tenantId, "LOST", 100)]);
  const activities = view === "actividades" ? await pendingCrmActivities(ctx.tenantId, board.cards.map((c) => c.id)) : [];
  const customer = customerId ? await pickerCustomer(ctx.tenantId, customerId) : null;
  const month = /^\d{4}-\d{2}$/.test(first(sp.mes)) ? first(sp.mes) : bogotaMonth();
  const lostRows = lost.map((o) => ({ id: o.id, name: o.interest, customer: o.customerId ? o.customerName : null, value: o.estimatedValue ?? 0, reason: o.lostReason }));
  return (
    <PipelineView
      slug={tenant}
      view={view}
      stages={board.stages}
      cards={board.cards}
      lost={board.lost}
      lostRows={lostRows}
      owners={board.owners}
      tags={board.tags}
      activities={activities}
      month={month}
      mine={mine}
      customerName={customer?.name ?? null}
      preset={first(sp.nueva) === "1" ? customer : null}
      hasAny={everything.cards.length > 0 || everything.lost.count > 0}
      canConfig={can(ctx.role, "business.manage")}
    />
  );
}
