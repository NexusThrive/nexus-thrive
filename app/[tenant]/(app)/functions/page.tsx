import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { VERTICAL_LABELS, VERTICAL_RECIPES, isVertical, type ModuleValue } from "@/lib/admin/catalogs";
import { CAPABILITIES } from "@/lib/capabilities/registry";
import { groupFunctions } from "@/lib/functions/functions";
import { setupStates } from "@/lib/functions/setup-db";
import { usageSignals } from "@/lib/functions/signals-db";
import { suggestFromUsage } from "@/lib/functions/suggestions";
import { loadPricingConfig } from "@/lib/plans/settings";
import { requireTenantContext } from "@/lib/tenant/context";
import { tenantWithModules } from "@/lib/tenant/membership";
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
  const [record, config, signals, setup] = await Promise.all([tenantWithModules(ctx.tenantId), loadPricingConfig(), usageSignals(ctx.tenantId), setupStates(ctx.tenantId)]);
  const active = new Set((record?.modules ?? []).filter((m) => m.active).map((m) => String(m.moduleName)));
  const vertical = isVertical(ctx.vertical) ? ctx.vertical : null;
  const profileSuggested = new Set<string>(vertical ? (VERTICAL_RECIPES[vertical].modules as readonly ModuleValue[]) : []);
  const sources = CAPABILITIES.map((c) => {
    const cfg = config.modules.find((m) => m.module === c.id);
    return { id: c.id as ModuleValue, label: cfg?.label ?? c.name, pitch: c.pitch, kind: c.kind, status: cfg?.status ?? c.status, category: c.category };
  });
  const groups = groupFunctions(sources, active, profileSuggested, suggestFromUsage(signals, active), vertical ? VERTICAL_LABELS[vertical].toLowerCase() : "tu rubro");
  for (const item of [...groups.inUse, ...groups.suggested, ...groups.more]) item.setup = setup[item.id] ?? null;
  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Sistema" title="Funciones" description="El catálogo de NEXUS. Es una sola plataforma: enciende lo que tu negocio use y apaga el resto, tus datos se conservan." />
      <FunctionsView slug={tenant} groups={groups} canManage={ctx.role === "OWNER" || ctx.role === "SUPERADMIN"} profile={vertical ? VERTICAL_LABELS[vertical] : null} />
    </div>
  );
}
