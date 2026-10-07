import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import Header from "../components/tenant/header";
import Sidebar from "../components/tenant/sidebar";
import { SidebarProvider } from "../components/tenant/sidebar-context";

/**
 * Shell del negocio (multi-tenant).
 *
 * Server Component: resuelve tenant, acceso y usuario con Clerk + Prisma aquí,
 * y pasa al cliente únicamente strings serializables (`tenantName`, `tenantSlug`).
 */
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    redirectToSignIn();
    return null;
  }

  // 1) El tenant debe existir y estar activo.
  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();

  if (!tenantRecord) {
    notFound();
  }

  // 2) Contexto de acceso a la base de datos del tenant.
  const tenantDb = createTenantDb(tenantRecord.id);

  // 3) Usuario local asociado al tenant (con bootstrap del primer OWNER).
  let localUser = await tenantDb.users.findByClerkUserId(userId);

  if (!localUser) {
    const hasMembers = (await tenantDb.users.findFirst()) !== null;

    if (hasMembers) {
      return <AccessDenied tenantName={tenantRecord.name} />;
    }

    const user = await currentUser();

    const primaryEmail =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      "";

    localUser = await tenantDb.users.upsertByClerkUserId({
      clerkUserId: userId,
      email: primaryEmail,
      name:
        `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
        "Usuario",
      role: "OWNER",
    });
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

function AccessDenied({ tenantName }: { tenantName: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 font-sans">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-lg font-semibold text-rose-600"
        >
          !
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Sin acceso
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Tu cuenta no está vinculada a{" "}
          <strong className="font-semibold text-slate-700">
            {tenantName}
          </strong>
          . Pide a un administrador que te invite antes de entrar.
        </p>
      </div>
    </div>
  );
}
