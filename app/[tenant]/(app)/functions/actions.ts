"use server";

import { revalidatePath } from "next/cache";
import { isModule, isVertical } from "@/lib/admin/catalogs";
import { CAPABILITIES } from "@/lib/capabilities/registry";
import { toggleProblem } from "@/lib/functions/functions";
import { tenantWithModules } from "@/lib/tenant/membership";
import { checkModuleToggle } from "@/lib/plans/compat";
import { loadPricingConfig } from "@/lib/plans/settings";
import { moduleRulesOf, setTenantModule } from "@/lib/tenant/settings-db";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type FunctionResult = { ok: true; message: string } | { ok: false; message: string };

/** Enciende o apaga una función del negocio. Solo el dueño; todo está incluido en el plan. */
export async function setFunctionAction(slug: string, moduleName: string, active: boolean): Promise<FunctionResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  if (ctx.role !== "OWNER" && ctx.role !== "SUPERADMIN") return { ok: false, message: "Solo el dueño del negocio enciende o apaga funciones." };
  if (!isModule(moduleName)) return { ok: false, message: "Esa función no existe." };

  // Dependencias: no se deja el sistema a medias (encender sin lo que necesita, o apagar lo que otra usa).
  const record = await tenantWithModules(ctx.tenantId);
  const activeNow = new Set((record?.modules ?? []).filter((m) => m.active).map((m) => String(m.moduleName)));
  const problem = toggleProblem(moduleName, active, activeNow, (id) => CAPABILITIES.find((c) => c.id === id)?.name ?? id);
  if (problem) return { ok: false, message: problem };

  const rules = await moduleRulesOf(ctx.tenantId);
  if (rules && isVertical(rules.vertical)) {
    const check = checkModuleToggle(await loadPricingConfig(), rules.vertical, moduleName, active, null);
    if (!check.ok) return { ok: false, message: check.message };
  }
  await setTenantModule(ctx.tenantId, moduleName, active);
  await logTenantAction(ctx, "BIZ_MODULE_TOGGLE", { moduleName, active });
  // El menú del negocio sale de TenantModule: se revalida todo el segmento.
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, message: active ? "Función encendida: ya está en tu menú" : "Función apagada (tus datos se conservan)" };
}
