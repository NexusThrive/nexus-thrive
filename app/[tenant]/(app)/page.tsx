import type { Metadata } from "next";
import { requirePageContext } from "@/lib/core/tenancy/context";
import { loadTrialIndicator } from "@/lib/experience/onboarding/trial";
import { AppHome } from "@/components/organisms/app-home";

export const metadata: Metadata = { title: "Inicio" };

/** Entrada del negocio: la pantalla de aplicaciones (App Home). El panel de cifras es la app Resumen (/resumen). */
export default async function AppHomePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requirePageContext(tenant);
  // Aviso de prueba gratuita: solo aquí (en Inicio), no en la barra superior.
  const trial = await loadTrialIndicator(ctx.tenantId);
  return <AppHome trial={trial ? { daysLeft: trial.daysLeft, level: trial.level, planHref: `/${tenant}/settings` } : null} />;
}
