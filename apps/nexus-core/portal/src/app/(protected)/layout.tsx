import { redirect } from "next/navigation";
import { prisma } from "@/lib/core/prisma";
import { getOrgActiva, getMisOrgs } from "@/lib/core/org";
import { getModulosActivos } from "@/lib/core/modulos";
import { Navbar } from "@/components/core/Navbar";
import { NavModulos } from "@/components/core/NavModulos";

/**
 * Shell del NÚCLEO (nivel negocio): sesión + org activa + onboarding por
 * persona.
 *
 * SPLIT (decisión 2026-09-16):
 *   - NAVBAR (arriba, global): logo → "Mis negocios", selector de negocio,
 *     cuenta. No cambia según el módulo.
 *   - SIDEBAR (izquierda, scoped al negocio activo): Inicio · módulo activo
 *     con sus secciones (CAJA MENOR → Dashboard · Movimientos · Categorías)
 *     · Agregar módulo.
 * La base no conoce clientes/pagos/gastos: eso vive dentro de cada módulo.
 */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { member, org } = await getOrgActiva();

  // Onboarding POR PERSONA: cada usuario nuevo ve la guía hasta completarla,
  // aunque la org ya esté armada. La política NO vive en la org.
  const miembro = await prisma.member.findUnique({
    where: { email_orgId: { email: member.email, orgId: org.id } },
  });
  if (!miembro?.onboardingCompletadoAt) redirect("/onboarding");

  const [modulos, misOrgs] = await Promise.all([
    getModulosActivos(org.id),
    getMisOrgs(member.email),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-nexus-bg">
      <Navbar
        org={org}
        orgs={misOrgs.map((m) => m.org)}
        member={member}
      />

      <div className="flex flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-nexus-border bg-nexus-surface">
          <NavModulos
            modulos={modulos.map((om) => ({
              slug: om.module.slug,
              nombre: om.module.nombre,
              icono: om.module.icono,
            }))}
          />
        </aside>

        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}