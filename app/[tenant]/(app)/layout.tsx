import { notFound, redirect } from "next/navigation";
import { rememberBusinessAction } from "./_actions/business";
import { activeTenantWithModules, businessesOfMember, memberTheme } from "@/lib/core/tenancy/membership";
import { sortModules, isModule } from "@/lib/core/capabilities/modules";
import { getVerticalTerms, hasMemberAccess } from "@/lib/core/sectors/terms";
import { TenantShell } from "@/components/templates/tenant-shell";
import { VerticalTermsProvider } from "./vertical-terms-context";
import TenantNotifications from "./_components/tenant-notifications";
import { TrialIndicator, TrialNote } from "@/components/organisms/trial-indicator";
import { loadTrialIndicator } from "@/lib/experience/onboarding/trial";
import { loadFirstSteps } from "@/lib/experience/onboarding/first-steps";
import { FirstStepsIndicator } from "@/components/organisms/first-steps-indicator";
import ThemeSync from "./_components/theme-sync";
import { HelpCenter } from "@/components/organisms/help-center";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createTenantDb } from "@/lib/core/tenancy/db";
import { AppEntrySplash, SPLASH_COOKIE } from "@/components/organisms/app-entry-splash";

/**
 * Ruta `(app)`: shell del negocio + gate de onboarding.
 *
 * Todas las rutas del negocio que NO son el wizard pasan por aquí. Si el
 * tenant aún no completó el onboarding, redirige a `/{tenant}/onboarding`.
 *
 * La ruta `/onboarding` vive FUERA de este grupo (hermana de `(app)`), por
 * lo que el gate no puede redirigir el wizard hacia sí mismo: no hay loop.
 * El layout padre `[tenant]` ya garantizó sesión, tenant activo y membresía
 * antes de renderizar hijos.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const tenantRecord = await activeTenantWithModules(tenantSlug);

  if (!tenantRecord) {
    notFound();
  }

  if (!tenantRecord.onboardingCompleted) {
    // Reanuda el tenant pendiente en el wizard adaptativo (top-level
    // `/onboarding`; el proxy lo deja pasar en subdominios de tenant).
    // `/{tenant}/onboarding` redirige aquí mismo (hay un solo wizard).
    redirect(`/onboarding?tenant=${tenantRecord.slug}`);
  }

  // Nav espejo de TenantModule: solo se muestra lo que está ACTIVO.
  const activeModules = sortModules(
    tenantRecord.modules
      .filter((module) => module.active)
      .map((module) => module.moduleName)
      .filter(isModule),
  );

  const { userId } = await auth();
  const [savedTheme, businesses, me] = userId
    ? await Promise.all([memberTheme(tenantRecord.id, userId), businessesOfMember(userId), createTenantDb(tenantRecord.id).users.findByClerkUserId(userId)])
    : [null, [], null];

  // Prueba de autoservicio o acceso temporal: sus días restantes van en la barra superior.
  const trial = await loadTrialIndicator(tenantRecord.id);

  // Primeros pasos: el círculo de la barra superior (desaparece cuando están todos hechos).
  const terms = getVerticalTerms(tenantRecord.vertical);
  const firstSteps = await loadFirstSteps({ tenantId: tenantRecord.id, slug: tenantRecord.slug, activeModules, customerWord: terms.customer.toLowerCase() });

  // La intro de la N solo sale al entrar a la app tras iniciar sesión (una vez por sesión).
  const showSplash = !(await cookies()).has(SPLASH_COOKIE);

  return (
    <VerticalTermsProvider terms={terms}>
      {showSplash ? <AppEntrySplash /> : null}
      <TenantShell
        tenantSlug={tenantRecord.slug}
        tenantName={tenantRecord.name}
        vertical={tenantRecord.vertical}
        activeModules={activeModules}
        role={me?.role}
        businesses={businesses}
        onSwitchBusiness={rememberBusinessAction}
        accountExtra={
          trial ? (
            <TrialNote daysLeft={trial.daysLeft} endsAt={trial.endsAt} level={trial.level} planName={trial.planName} planHref={`/${tenantRecord.slug}/settings`} />
          ) : null
        }
        topbarActions={
          <>
            <FirstStepsIndicator steps={firstSteps} />
            {trial ? (
              <span className="max-md:hidden">
                <TrialIndicator
                  daysLeft={trial.daysLeft}
                  endsAt={trial.endsAt}
                  planName={trial.planName}
                  level={trial.level}
                  planHref={`/${tenantRecord.slug}/settings`}
                />
              </span>
            ) : null}
            <TenantNotifications tenantSlug={tenantRecord.slug} />
          </>
        }
      >
        <ThemeSync tenantSlug={tenantRecord.slug} saved={savedTheme} />
        {children}
        <HelpCenter tenantSlug={tenantRecord.slug} businessName={tenantRecord.name} activeModules={activeModules} showFunctions={!hasMemberAccess(tenantRecord.vertical)} />
      </TenantShell>
    </VerticalTermsProvider>
  );
}