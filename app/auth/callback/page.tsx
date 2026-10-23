import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { acceptInvitesFor } from "@/lib/business/team-db";
import { homeTenantFor } from "@/lib/tenant/membership";
import { findStaffByEmail, getStaffContext } from "@/lib/ops/access";
import { StaffAccessNotice } from "@/components/molecules/staff-access-notice";
import { verifiedEmailOf } from "@/lib/auth/session-email";

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
  // Solo el correo principal verificado vincula fichas o invitaciones (SEC-10).
  const email = verifiedEmailOf(me) ?? "";

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

  // Negocio del usuario (solo membresías activas)
  const home = await homeTenantFor(userId);
  if (home) redirect(home.onboardingCompleted ? `/${home.slug}` : "/onboarding");

  // Usuario nuevo (aún no tiene tenant) → onboarding
  redirect("/onboarding");
}
