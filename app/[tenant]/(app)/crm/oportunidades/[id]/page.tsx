import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOpportunityDetail, opportunityNeighbors } from "@/lib/business/growth/pipeline-read";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import OpportunityDetail from "./_components/opportunity-detail";

export const metadata: Metadata = { title: "Oportunidad" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
/** Filtros del pipeline que viajan en la URL (para volver y para el paginador). */
const LIST_KEYS = ["mios", "q", "responsable", "etiqueta", "prioridad", "desde", "hasta", "min", "max", "cliente", "vista"] as const;

/** Detalle de la oportunidad (pantalla 9). Server Component: la oportunidad se busca por `tenantId`; si no es del negocio, 404. */
export default async function OpportunityPage({ params, searchParams }: { params: Promise<{ tenant: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { tenant, id } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(tenant, "/crm");
  if (!ctx) notFound();
  const o = await getOpportunityDetail(ctx.tenantId, id);
  if (!o) notFound();
  const list = Object.fromEntries(LIST_KEYS.map((k) => [k, first(sp[k])]).filter(([, v]) => v)) as Record<string, string>;
  const qs = new URLSearchParams(list).toString();
  const backHref = `/${tenant}/crm${qs ? `?${qs}` : ""}`;
  const neighbors = await opportunityNeighbors(ctx.tenantId, id, {
    me: ctx.memberId,
    mine: list.mios !== "0",
    q: list.q,
    ownerId: list.responsable,
    tag: list.etiqueta,
    customerId: list.cliente,
  });
  const href = (target: string) => `/${tenant}/crm/oportunidades/${target}${qs ? `?${qs}` : ""}`;
  return (
    <OpportunityDetail
      slug={tenant}
      o={o}
      now={new Date().toISOString()}
      backHref={backHref}
      pager={neighbors ? { index: neighbors.index, total: neighbors.total, prevHref: neighbors.prev ? href(neighbors.prev) : null, nextHref: neighbors.next ? href(neighbors.next) : null } : null}
    />
  );
}
