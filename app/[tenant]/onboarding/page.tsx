import { notFound, redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { isPaymentMethod } from "@/lib/admin/catalogs";
import OnboardingShell from "./_components/onboarding-shell";

/**
 * Wizard de onboarding del negocio (a pantalla completa, sin el shell del
 * negocio). El acceso (sesión + tenant activo + membresía) lo garantiza
 * `app/[tenant]/layout.tsx`; este layout de ruta es hermano de `(app)`,
 * por lo que el gate de onboarding JAMÁS redirige al wizard hacia sí mismo.
 *
 * - Tenant ya completado → dashboard (el gate de `(app)` haría lo mismo).
 * - Prefill con lo persistido: si el usuario cerró a mitad de camino,
 *   retoma donde quedó con los datos ya guardados.
 */
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();

  if (!tenantRecord) {
    notFound();
  }

  if (tenantRecord.onboardingCompleted) {
    redirect(`/${tenantSlug}`);
  }

  const paymentMethods = (tenantRecord.paymentMethods ?? []).filter(
    (method) => isPaymentMethod(method),
  );

  return (
    <OnboardingShell
      tenantSlug={tenantSlug}
      initial={{
        name: tenantRecord.name,
        city: tenantRecord.city ?? "",
        whatsappNumber: tenantRecord.whatsappNumber ?? "",
        vertical: tenantRecord.vertical,
        websiteUrl: tenantRecord.websiteUrl ?? "",
        googleBusinessUrl: tenantRecord.googleBusinessUrl ?? "",
        instagramHandle: tenantRecord.instagramHandle ?? "",
        paymentMethods,
      }}
    />
  );
}