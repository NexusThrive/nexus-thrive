import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { acceptInvitesFor } from "@/lib/core/tenancy/team-db";
import { homeTenantFor, managedAccessForEmail } from "@/lib/core/tenancy/membership";
import { findStaffByEmail, getStaffContext } from "@/lib/platform/team/access";
import { StaffAccessNotice } from "@/components/molecules/staff-access-notice";
import { verifiedEmailOf } from "@/lib/core/auth/session-email";
import { ManagedAccessNotice } from "@/components/molecules/managed-access-notice";

/** Access is resolved on the server; retired onboarding is never a destination. */
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
  if (home?.access === "ready") redirect(`/${home.slug}`);
  if (home) return <ManagedAccessNotice reason={home.access === "preparing" ? "preparing" : "suspended"} />;
  const pending = await managedAccessForEmail(email);
  return <ManagedAccessNotice reason={pending ?? "unauthorized"} />;
}
