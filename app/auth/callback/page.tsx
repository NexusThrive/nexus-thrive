import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/prisma/db";

/**
 * Callback post-login de Clerk.
 *
 * Decide a dónde enviar al usuario según su rol/tenant en la BD:
 * - SUPERADMIN → /admin
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

  // ¿Es SuperAdmin?
  const superAdmin = await db.orm.public.User
    .where({ clerkUserId: userId, role: "SUPERADMIN" })
    .first();

  if (superAdmin) {
    redirect("/admin");
  }

  // Buscar tenant del usuario
  const user = await db.orm.public.User
    .where({ clerkUserId: userId })
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