import { notFound, redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { sortModules } from "@/lib/admin/catalogs";
import { getVerticalTerms } from "@/lib/vertical-terms";
import { TenantShell } from "@/components/templates/tenant-shell";
import { VerticalTermsProvider } from "./vertical-terms-context";
import TenantNotifications from "./_components/tenant-notifications";
import ThemeSync from "./_components/theme-sync";
import { auth } from "@clerk/nextjs/server";

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

  const tenantRecord = await db.orm.public.Tenant
    .where({
      slug: tenantSlug,
      active: true,
    })
    .include("modules", (module) => module.select("moduleName", "active"))
    .first();

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
      .map((module) => module.moduleName),
  );

  const { userId } = await auth();
  const me = userId ? await db.orm.public.User.where({ tenantId: tenantRecord.id, clerkUserId: userId }).select("theme").first() : null;
  const savedTheme = me?.theme === "dark" || me?.theme === "light" ? me.theme : null;

  return (
    <VerticalTermsProvider terms={getVerticalTerms(tenantRecord.vertical)}>
      <TenantShell
        tenantSlug={tenantRecord.slug}
        tenantName={tenantRecord.name}
        vertical={tenantRecord.vertical}
        activeModules={activeModules}
        topbarActions={<TenantNotifications tenantSlug={tenantRecord.slug} />}
      >
        <ThemeSync tenantSlug={tenantRecord.slug} saved={savedTheme} />
        {children}
      </TenantShell>
    </VerticalTermsProvider>
  );
}