import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { acceptInvitesFor } from "@/lib/business/team-db";
import { getStaffContext } from "@/lib/ops/access";

/**
 * Callback post-login de Clerk.
 *
 * Decide a dónde enviar al usuario según su rol/tenant en la BD:
 * - Equipo NEXUS (o el SUPERADMIN heredado) → /admin (Operations Center)
 * - Usuario con tenant y onboarding completado → /{tenantSlug}
 * - Usuario con tenant SIN onboarding → /onboarding
 * - Sin usuario en BD (recién registrado) → /onboarding
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

  // Invitaciones pendientes a su correo: lo suman al equipo de esos negocios.
  const me = await currentUser();
  const email = me?.primaryEmailAddress?.emailAddress ?? me?.emailAddresses?.[0]?.emailAddress ?? "";
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