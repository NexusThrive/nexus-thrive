"use server";

import { requireTenantContext } from "@/lib/core/tenancy/context";
import { crmSearchDefs } from "@/lib/business/growth/crm-search";
import { loadPipeline } from "@/lib/business/growth/pipeline-db";
import { countOptions, parseSearchState, type SearchState } from "@/lib/foundation/list-search";
import { paramsOfSnapshot, snapshotOf } from "@/lib/foundation/list-search";

/** Cuántas oportunidades quedarían al activar cada filtro del pipeline, con la búsqueda tal como está. */
export async function crmFilterCountsAction(tenantSlug: string, state: SearchState): Promise<Record<string, number>> {
  const ctx = await requireTenantContext(tenantSlug, "/crm");
  if (!ctx) return {};
  const everything = await loadPipeline(ctx.tenantId);
  const defs = crmSearchDefs({ me: ctx.memberId, owners: everything.owners, stages: everything.stages, tags: everything.tags });
  return countOptions(everything.cards, defs, parseSearchState(paramsOfSnapshot(snapshotOf(state)), defs));
}
