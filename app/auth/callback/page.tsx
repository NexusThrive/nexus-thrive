import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { acceptInvitesFor } from "@/lib/business/team-db";
import { findStaffByEmail, getStaffContext } from "@/lib/ops/access";
import { StaffAccessNotice } from "@/components/molecules/staff-access-notice";

/**
 * Callback post-login de Clerk: la ÚNICA puerta que decide a dónde va cada
 * persona después de registrarse o entrar.
 *
 * - Equipo NEXUS (o el SUPERADMIN heredado) → /admin (Operations Center).
 * - Correo en el equipo pero sin acceso (pausado, o con otra cuenta) → aviso
 *   que explica qué hacer. Antes caía en el onboarding y la persona terminaba
 *   creando un negocio por error.
 * - Usuario con tenant y onboarding completado → /{tenantSlug}.
 * - Usuario con tenant SIN onboarding → /onboarding.
 * - Sin usuario en BD (recién registrado) → /onboarding.
 */
export default async function AuthCallback() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    redirectToSignIn();
    return null;
  }

  // ¿Es del equipo NEXUS? (también vincula invitaciones y el primer Propietario)
  if (await getStaffContext()) {
    redirect("/admin");
  }

  const me = await currentUser();
  const email = me?.primaryEmailAddress?.emailAddress ?? me?.emailAddresses?.[0]?.emailAddress ?? "";

  // Su correo está en el equipo pero esta sesión no puede entrar al panel:
  // se lo decimos en vez de mandarlo a crear un negocio.
  if (email) {
    const staff = await findStaffByEmail(email);
    if (staff) {
      return (
        <StaffAccessNotice
          email={staff.email}
          name={staff.name}
          roleName={staff.roleName}
          reason={staff.active ? "other_account" : "inactive"}
        />
      );
    }
  }

  // Invitaciones pendientes a su correo: lo suman al equipo de esos negocios.
  const invitedTo = await acceptInvitesFor(userId, email, me?.fullName ?? null);
  if (invitedTo.length) redirect(`/${invitedTo[0]}`);

  // Buscar tenant del usuario (solo membresías activas)
  const user = await db.orm.public.User
    .where({ clerkUserId: userId, active: true })
    .include("tenant", (t) => t.select("slug", "onboardingCompleted"))
    .first();

  if (user?.tenant) {
    const { slug, onboardingCompleted } = user.tenant;
    if (onboardingCompleted) {
      redirect(`/${slug}`);
    } else {
      redirect("/onboarding");
    }
  }

  // Usuario nuevo (aún no tiene tenant) → onboarding
  redirect("/onboarding");
}
