import type { Metadata } from "next";
import { registrationTenant } from "@/lib/business/customers/registration-db";
import RegistrationCard from "./registration-card";

export const metadata: Metadata = {
  title: "Registro de clientes",
  robots: { index: false, follow: false },
};

/** Enlace público de registro del gimnasio (`/registro/{negocio}`). */
export default async function PublicRegistrationPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await registrationTenant(slug);

  if (!tenant) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface-muted px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-xl font-semibold text-foreground">Registro no disponible</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Este enlace no está activo. Pídele al gimnasio un enlace nuevo o comunícate directamente con su equipo.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <RegistrationCard slug={slug} name={tenant.name} logoUrl={tenant.logoId ? `/api/registro/${encodeURIComponent(slug)}/logo` : null} />
    </main>
  );
}
