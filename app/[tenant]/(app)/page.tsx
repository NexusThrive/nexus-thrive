import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { requirePageContext } from "@/lib/core/tenancy/context";
import { tenantWithModules } from "@/lib/core/tenancy/membership";
import { createTenantDb } from "@/lib/core/tenancy/db";
import { isModule, sortModules } from "@/lib/core/capabilities/modules";
import { loadTrialIndicator } from "@/lib/experience/onboarding/trial";
import { loadHomeSummary } from "@/lib/experience/dashboard/home-summary";
import { AppHome } from "@/components/organisms/app-home";

export const metadata: Metadata = { title: "Inicio" };

/**
 * Inicio unificado: el cajón de aplicaciones al centro y, a los lados, las cifras del mes y lo de hoy. Las cifras salen de las mismas
 * fuentes que Resumen (`loadHomeSummary`); la ruta /resumen se conserva, pero ya no es una app del cajón.
 */
export default async function AppHomePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requirePageContext(tenant);
  const [tenantRecord, user, trial] = await Promise.all([tenantWithModules(ctx.tenantId), currentUser(), loadTrialIndicator(ctx.tenantId)]);
  const modules = sortModules((tenantRecord?.modules ?? []).filter((m) => m.active).map((m) => m.moduleName).filter(isModule));
  // El rol decide si se ven montos (misma regla de Resumen); el saludo usa el nombre vivo de Clerk o, si falta, el del equipo.
  const me = user ? await createTenantDb(ctx.tenantId).users.findByClerkUserId(user.id) : null;
  const summary = await loadHomeSummary(ctx.tenantId, modules, me?.role ?? null);
  const userName = user?.firstName?.trim() || me?.name?.split(" ")[0] || null;
  // Aviso de prueba gratuita: solo aquí (en Inicio), como una pastilla junto al saludo.
  return (
    <AppHome
      trial={trial ? { daysLeft: trial.daysLeft, level: trial.level, planHref: `/${tenant}/settings` } : null}
      summary={summary}
      userName={userName}
    />
  );
}
