import { redirect } from "next/navigation";
import { getOrgActiva } from "@/lib/core/org";
import { cajamenorHabilitado } from "@/lib/modulos/caja-menor/datos";

export const dynamic = "force-dynamic";

/**
 * MÓDULO CAJA MENOR — solo se entra si la org lo tiene ACTIVO.
 * La navegación del módulo (Dashboard · Movimientos · Categorías) vive en
 * la NAVBAR (lib/navegacion.ts); el layout solo cuida el acceso.
 */
export default async function CajaMenorModuleLayout({ children }: { children: React.ReactNode }) {
  const { org } = await getOrgActiva();
  if (!(await cajamenorHabilitado(org.id))) redirect("/");

  return <div className="space-y-6">{children}</div>;
}