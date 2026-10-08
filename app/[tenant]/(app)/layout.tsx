import { notFound, redirect } from "next/navigation";
import { db } from "@/prisma/db";
import Header from "../../components/tenant/header";
import Sidebar from "../../components/tenant/sidebar";
import { SidebarProvider } from "../../components/tenant/sidebar-context";

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

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();

  if (!tenantRecord) {
    notFound();
  }

  if (!tenantRecord.onboardingCompleted) {
    redirect(`/${tenantRecord.slug}/onboarding`);
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Header tenantName={tenantRecord.name} />

        <Sidebar
          tenantSlug={tenantRecord.slug}
          tenantName={tenantRecord.name}
        />

        <main className="px-4 py-6 sm:px-6 lg:py-8 lg:pl-[18rem] lg:pr-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}