import { redirect } from "next/navigation";
import { getOrgActiva } from "@/lib/core/org";
import { prisma } from "@/lib/core/prisma";
import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";

/**
 * ONBOARDING — cada USUARIO nuevo arma SU negocio con los datos que Nexus
 * necesita. El catálogo de módulos viene del servidor y se le pasa al wizard:
 * solo los módulos reales (los que el CEO construyó) son elegibles al
 * seleccionar "Otro negocio".
 */
export default async function OnboardingPage() {
  const { member, org } = await getOrgActiva();

  const miembro = await prisma.member.findUnique({
    where: { email_orgId: { email: member.email, orgId: org.id } },
  });
  if (miembro?.onboardingCompletadoAt) redirect("/");

  // Personalización ("Personalizar negocio"): SOLO capas horizontales.
  // Los verticales (plantillas de rubro, ej. Gym) no se eligen por búsqueda:
  // entran cuando el rubro de la org coincide con su plantilla.
  const catalogo = await prisma.module.findMany({
    where: { activo: true, naturaleza: "CAPA" },
    select: {
      id: true,
      slug: true,
      nombre: true,
      descripcion: true,
      icono: true,
      campo: true,
    },
    orderBy: { orden: "asc" },
  });

  return <OnboardingWizard orgNombre={org.nombre} catalogo={catalogo} />;
}