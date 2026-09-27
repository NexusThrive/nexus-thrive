import { redirect } from "next/navigation";
import { getOrgActiva } from "@/lib/core/org";
import { gymHabilitado } from "@/lib/plantillas/gym/dashboard";

export const dynamic = "force-dynamic";

/**
 * MÓDULO GYM — solo se entra si la org lo tiene ACTIVO.
 * La navegación del módulo (Dashboard · Clientes · Pagos · Gastos) vive en
 * la NAVBAR (lib/navegacion.ts); el layout solo cuida el acceso.
 */
export default async function GymModuleLayout({ children }: { children: React.ReactNode }) {
  const { org } = await getOrgActiva();
  if (!(await gymHabilitado(org.id))) redirect("/");

  return <div className="space-y-6">{children}</div>;
}