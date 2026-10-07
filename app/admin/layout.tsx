import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { createAdminDb } from "@/lib/admin-db";

/**
 * Gate del panel CEO / SuperAdmin, en el layout (mismo patrón de
 * autorización que `app/[tenant]/layout.tsx`, único verificado con
 * `redirectToSignIn` operativo en este repo):
 *
 * - Sin sesión → signIn (con retorno al panel).
 * - Sesión sin `User.role = SUPERADMIN` → 404: el panel no se revela a
 *   usuarios comunes.
 *
 * La capa de datos de cada Server Action revalida el rol por su cuenta
 * (defensa en profundidad ante llamadas directas a las actions).
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    redirectToSignIn();
    return null;
  }

  const isSuperAdmin = await createAdminDb().isSuperAdmin(userId);
  if (!isSuperAdmin) {
    // notFound dentro del layout: Next responde 404 sin renderizar el panel.
    notFound();
  }

  return <>{children}</>;
}
