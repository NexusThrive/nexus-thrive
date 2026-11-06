import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { VERTICAL_LABELS, isVertical } from "@/lib/core/sectors/verticals";
import { VERTICAL_RECIPES } from "@/lib/core/sectors/catalog";
import { type ModuleValue } from "@/lib/core/capabilities/modules";
import { CAPABILITIES } from "@/lib/core/capabilities/registry";
import { groupFunctions } from "@/lib/core/capabilities/discovery/functions";
import { setupStates } from "@/lib/core/capabilities/discovery/setup-db";
import { usageSignals } from "@/lib/core/capabilities/discovery/signals-db";
import { suggestFromUsage } from "@/lib/core/capabilities/discovery/suggestions";
import { loadPricingConfig } from "@/lib/core/entitlements/settings";
import { isCompatible } from "@/lib/core/capabilities/solutions";
import { solutionOfTenant } from "@/lib/core/tenancy/solution-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { tenantWithModules } from "@/lib/core/tenancy/membership";
import FunctionsView from "./_components/functions-view";

/**
 * Funciones: todo lo que el sistema puede hacer por tu negocio, con lo que ya
 * usas, lo que te sugerimos (por tu rubro y por lo que haces) y el resto. Todo
 * está incluido; encender o apagar solo cambia lo que ves en el menú.
 */
export default async function FunctionsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant);
  if (!ctx) notFound();
  const [record, config, signals, setup, solution] = await Promise.all([tenantWithModules(ctx.tenantId), loadPricingConfig(), usageSignals(ctx.tenantId), setupStates(ctx.tenantId), solutionOfTenant(ctx.tenantId)]);
  const active = new Set((record?.modules ?? []).filter((m) => m.active).map((m) => String(m.moduleName)));
  const vertical = isVertical(ctx.vertical) ? ctx.vertical : null;
  const profileSuggested = new Set<string>(vertical ? (VERTICAL_RECIPES[vertical].modules as readonly ModuleValue[]) : []);
  const sources = CAPABILITIES.map((c) => {
    const cfg = config.modules.find((m) => m.module === c.id);
    return { id: c.id as ModuleValue, label: cfg?.label ?? c.name, pitch: c.pitch, kind: c.kind, status: cfg?.status ?? c.status, category: c.category };
  });
  const groups = groupFunctions(sources, active, profileSuggested, suggestFromUsage(signals, active), vertical ? VERTICAL_LABELS[vertical].toLowerCase() : "tu rubro", (id) => isCompatible(solution, id));
  for (const item of [...groups.inUse, ...groups.suggested, ...groups.more]) item.setup = setup[item.id] ?? null;
  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Sistema" title="Funciones" description="El catálogo de NEXUS. Es una sola plataforma: enciende lo que tu negocio use y apaga el resto, tus datos se conservan." />
      <FunctionsView slug={tenant} groups={groups} canManage={ctx.role === "OWNER" || ctx.role === "SUPERADMIN"} profile={vertical ? VERTICAL_LABELS[vertical] : null} />
    </div>
  );
}
