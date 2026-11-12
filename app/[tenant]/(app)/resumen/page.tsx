import { redirect } from "next/navigation";
import { requirePageContext } from "@/lib/core/tenancy/context";

/**
 * Resumen y Inicio son la misma pantalla: el tablero fijo de Inicio (`../page.tsx`), sin edición. Esta ruta se conserva para los
 * enlaces antiguos y para el ítem «Resumen» de la barra lateral, y lleva al Inicio. El dashboard personalizable anterior sigue en el
 * historial de git. Comprueba antes la membresía y el módulo, como cualquier página del negocio.
 */
export default async function ResumenPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  await requirePageContext(tenant, "/resumen");
  redirect(`/${tenant}`);
}
