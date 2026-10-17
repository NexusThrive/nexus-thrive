import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOnboardingPrefill } from "./prefill";
import OnboardingWizard from "./_components/onboarding-wizard";
import { loadPricingConfig } from "@/lib/plans/settings";

/**
 * Onboarding adaptativo (auto-servicio).
 *
 * Ruta top-level (`/onboarding`, sin subdominio de tenant): vive FUERA del
 * gate de `(app)` que redirige a `/{tenant}/onboarding`, así que no hay
 * loop con el wizard clásico ni con el dashboard.
 *
 * El gate de autorización vive en `./layout.tsx` (mismo patrón que
 * `app/admin/layout.tsx` — en esta versión de Next, el mismo gate puesto
 * en una *page* termina en not-found; en layout redirige bien):
 *
 * - Sin sesión → sign-in (Clerk), con retorno a /onboarding.
 * - Usuario con tenant ya completado → redirige a su espacio.
 * - Usuario con tenant pendiente → reanuda la configuración (prefill).
 * - Usuario nuevo → crea su primer espacio desde cero.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    // El layout ya garantizó sesión; esto es defensa en profundidad.
    redirect("/sign-in");
  }

  const { tenant } = await searchParams;
  const prefill = await getOnboardingPrefill(userId, tenant);

  if (prefill.mode === "done" && prefill.doneSlug) {
    redirect(`/${prefill.doneSlug}`);
  }

  const user = await currentUser();
  // Rubros, planes, módulos y precios del catálogo del Operations Center.
  const config = await loadPricingConfig();
  return <OnboardingWizard prefill={prefill} firstName={user?.firstName ?? undefined} config={config} />;
}