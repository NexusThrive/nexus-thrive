import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";
import { expireBenefitTrial } from "@/lib/benefits/benefits-db";
import { acceptInvitesFor } from "@/lib/business/team-db";

/**
 * Shell multi-tenant: acceso.
 *
 * Server Component que resuelve sesión (Clerk), tenant (existente y
 * activo) y membresía del usuario. Es el ÚNICO responsable de autorización:
 * - Sin sesión → sign-in.
 * - Tenant inexistente/inactivo → 404.
 * - No miembro (y el tenant tiene miembros) → "Sin acceso" sin renderizar
 *   hijos.
 * - Tenant vacío → bootstrap del primer OWNER.
 *
 * Los hijos (dashboard, módulos u onboarding) solo se renderizan cuando la
 * membresía está confirmada. El layout de la ruta `(app)` decide después si
 * redirigir a onboarding según `onboardingCompleted`.
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

  // Vencimiento del mes gratis (beneficio de tarjeta): si su período ya pasó,
  // el negocio revierte a Essential (gratis). Idempotente y silencioso.
  await expireBenefitTrial(tenantRecord.id);

  // 2) Contexto de acceso a la base de datos del tenant.
  const tenantDb = createTenantDb(tenantRecord.id);

  // 3) Usuario local asociado al tenant (con bootstrap del primer OWNER).
  let localUser = await tenantDb.users.findByClerkUserId(userId);

  // ¿Lo invitaron a este negocio? Acepta la invitación al entrar.
  if (!localUser || !localUser.active) {
    const me = await currentUser();
    const email = me?.primaryEmailAddress?.emailAddress ?? me?.emailAddresses?.[0]?.emailAddress ?? "";
    const accepted = await acceptInvitesFor(userId, email, me?.fullName ?? null, tenantRecord.id);
    if (accepted.length) localUser = await tenantDb.users.findByClerkUserId(userId);
  }

  if (localUser && !localUser.active) {
    return <AccessDenied tenantName={tenantRecord.name} />;
  }

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

  // El shell visual (Header/Sidebar) vive en `(app)/layout.tsx`: el
  // onboarding se ve a pantalla completa, sin el shell del negocio.
  return <>{children}</>;
}

function AccessDenied({ tenantName }: { tenantName: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 font-sans">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-destructive/10 text-lg font-semibold text-destructive"
        >
          !
        </span>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Sin acceso
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Tu cuenta no está vinculada a{" "}
          <strong className="font-semibold text-foreground">
            {tenantName}
          </strong>
          . Pide a un administrador que te invite antes de entrar.
        </p>
      </div>
    </div>
  );
}