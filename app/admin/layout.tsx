import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getStaffContext } from "@/lib/ops/access";
import OpsShell from "./_components/ops-shell";

/**
 * Gate del NEXUS Operations Center (mismo patrón que `app/[tenant]/layout.tsx`):
 *
 * - Sin sesión → iniciar sesión, con retorno al panel.
 * - Sesión que no es integrante activo del equipo NEXUS → 404: el panel no
 *   se revela. El primer acceso del SUPERADMIN heredado crea el equipo y lo
 *   deja como Propietario (lib/ops/access.ts).
 *
 * Cada acción vuelve a verificar su permiso en el servidor.
 */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    redirectToSignIn();
    return null;
  }
  const staff = await getStaffContext();
  if (!staff) notFound();

  return (
    <OpsShell staff={{ name: staff.name, email: staff.email, roleName: staff.roleName, permissions: staff.permissions }}>
      {children}
    </OpsShell>
  );
}
