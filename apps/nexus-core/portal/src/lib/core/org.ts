/**
 * NÚCLEO — sesión y organización activa del usuario.
 *
 * La identidad es GLOBAL: el Member (email) es la persona y puede estar
 * en varias orgs. La org "activa" es con la que trabaja el usuario hoy:
 * la elige en el NAVBAR (cookie `nexus-org-activa`) o, si todavía no
 * eligió, la primera con onboarding completo (comportamiento anterior).
 */
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/core/prisma";
import { authOptions } from "@/lib/core/auth";

export async function requiereSesion() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  return { email: session.user.email, nombre: session.user.name ?? null };
}

/** Org activa del usuario: la elegida en el navbar (cookie), si no la primera con onboarding completo. */
export async function getOrgActiva() {
  const email = (await requiereSesion()).email;

  const elegida = cookies().get("nexus-org-activa")?.value;
  const porCookie = elegida
    ? await prisma.member.findFirst({
        where: { email, orgId: elegida, activo: true },
        include: { org: true },
      })
    : null;

  const member =
    porCookie ??
    (await prisma.member.findFirst({
      where: { email, activo: true },
      orderBy: [{ onboardingCompletadoAt: "desc" }, { createdAt: "asc" }],
      include: { org: true },
    }));

  if (!member) redirect("/registro");
  return { member, org: member.org };
}

/** Todas las orgs donde el usuario es miembro (para el futuro selector). */
export async function getMisOrgs(email: string) {
  return prisma.member.findMany({
    where: { email, activo: true },
    include: { org: true },
    orderBy: { createdAt: "asc" },
  });
}