import { auth } from "@clerk/nextjs/server";

/**
 * Gate de sesión del onboarding (mismo patrón que `app/admin/layout.tsx` y
 * `app/[tenant]/layout.tsx`). En esta versión de Next, invocar `auth()` y
 * devolver `redirectToSignIn()` desde una *page* termina en not-found
 * (404); desde un *layout* funciona y redirige a sign-in correctamente.
 */
export default async function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    redirectToSignIn();
    return null;
  }

  return <>{children}</>;
}