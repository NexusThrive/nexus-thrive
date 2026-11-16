import { notFound } from "next/navigation";
import { rememberBusinessAction } from "./_actions/business";
import { activeTenantWithModules, businessesOfMember, memberTheme } from "@/lib/core/tenancy/membership";
import { sortModules, isModule } from "@/lib/core/capabilities/modules";
import { getVerticalTerms } from "@/lib/core/sectors/terms";
import { TenantShell } from "@/components/templates/tenant-shell";
import { VerticalTermsProvider } from "./vertical-terms-context";
import TenantNotifications from "./_components/tenant-notifications";
import { TrialIndicator, TrialNote } from "@/components/organisms/trial-indicator";
import { loadTrialIndicator } from "@/lib/experience/onboarding/trial";
import { loadFirstSteps } from "@/lib/experience/onboarding/first-steps";
import { FirstStepsIndicator } from "@/components/organisms/first-steps-indicator";
import ThemeSync from "./_components/theme-sync";
import { AuriAssistant } from "@/components/organisms/auri-assistant";
import { CurrentUserProvider } from "@/components/providers/current-user";
import { auth } from "@clerk/nextjs/server";
import { createTenantDb } from "@/lib/core/tenancy/db";
import { SessionScope } from "@/components/providers/session-scope";

/** Access is resolved on the server; retired onboarding is never a destination. */
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

  // Nav espejo de TenantModule: solo se muestra lo que está ACTIVO.
  const activeModules = sortModules(
    tenantRecord.modules
      .filter((module) => module.active)
      .map((module) => module.moduleName)
      .filter(isModule),
  );

  const terms = getVerticalTerms(tenantRecord.vertical);
  // Todo lo que sigue solo depende del negocio ya leído (y de la sesión, que es local): una sola tanda en paralelo en lugar de cinco
  // esperas seguidas. En producción cada espera es un viaje a la base y el pool es de pocas conexiones.
  const authP = auth();
  const memberP = authP.then(async ({ userId }) => {
    if (!userId) return [null, [], null] satisfies [null, never[], null];
    return await Promise.all([memberTheme(tenantRecord.id, userId), businessesOfMember(userId), createTenantDb(tenantRecord.id).users.findByClerkUserId(userId)]);
  });
  const [{ userId }, [savedTheme, businesses, me], trial, firstSteps] = await Promise.all([
    authP,
    memberP,
    // Prueba de autoservicio o acceso temporal: sus días restantes van en la barra superior.
    loadTrialIndicator(tenantRecord.id),
    // Primeros pasos: el círculo de la barra superior (desaparece cuando están todos hechos).
    loadFirstSteps({ tenantId: tenantRecord.id, slug: tenantRecord.slug, activeModules, customerWord: terms.customer.toLowerCase() }),
  ]);

  return (
    <VerticalTermsProvider terms={terms}>
      {userId ? <SessionScope userId={userId} tenantId={tenantRecord.id} /> : null}
      <CurrentUserProvider firstName={me?.name?.trim().split(/\s+/)[0] || null}>
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
          </>
        }
        topbarNotifications={<TenantNotifications tenantSlug={tenantRecord.slug} />}
      >
        <ThemeSync tenantSlug={tenantRecord.slug} saved={savedTheme} />
        {children}
        <AuriAssistant tenantSlug={tenantRecord.slug} businessName={tenantRecord.name} activeModules={activeModules} showFunctions={false} />
      </TenantShell>
      </CurrentUserProvider>
    </VerticalTermsProvider>
  );
}
