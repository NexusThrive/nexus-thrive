import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import Header from "../components/tenant/header";

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

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();

  if (!tenantRecord) {
    notFound();
  }

  const tenantDb = createTenantDb(tenantRecord.id);

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

  const displayName = localUser.name || localUser.email;

  return (
    <div>
      <Header tenantName={tenantRecord.name} />

      <div>
        <span>Negocio Activo</span>

        <h1>{tenantRecord.name}</h1>

        <p>
          Hola, <strong>{displayName}</strong> ({localUser.role})
        </p>
      </div>

      {children}
    </div>
  );
}

function AccessDenied({ tenantName }: { tenantName: string }) {
  return (
    <div>
      <h2>Sin acceso</h2>

      <p>
        Tu cuenta no está vinculada a{" "}
        <strong>{tenantName}</strong>. Pide a un administrador que
        te invite antes de entrar.
      </p>
    </div>
  );
}
