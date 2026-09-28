/**
 * NÚCLEO — guard de ACCESO a un módulo, en la capa de rutas.
 *
 * POR QUÉ EXISTE
 * --------------
 * Cada módulo se navega suelto en `/modulos/<slug>` (invariante del schema:
 * un archivo en `schema/modulos/` es un `Module.slug`, y el slug también es
 * su ruta). Antes de esto, los cuatro módulos de Gym colgaban del layout de
 * la PLANTILLA: un solo guard con el slug "gym" cubría clientes, pagos y
 * gastos. Eso rompe en cuanto un módulo deja de ser de un rubro: `clientes`
 * pasa a CAPA y su guard tiene que decir "clientes", no "gym".
 *
 * Además, un guard por módulo significa que activar SOLO `clientes` en una
 * organización abre su pantalla y nada más — que es lo que el negocio
 * contrató. Con el layout de plantilla, cuatro módulos quedaban atados.
 *
 * La DECISIÓN de si la org tiene el módulo vive en `lib/core/requiere-modulo.ts`
 * (el mismo gate que usan las server actions). Acá solo se redirige.
 */
import { redirect } from "next/navigation";
import { getOrgActiva } from "@/lib/core/org";
import { moduloActivoEnOrg } from "@/lib/core/requiere-modulo";

/**
 * Envuelve las páginas de un módulo y exige que la org activa lo tenga
 * ACTIVO. Si no, vuelve al panel (que es donde se activan módulos).
 */
export async function GuardModulo({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { org } = await getOrgActiva();
  if (!(await moduloActivoEnOrg(slug, org.id))) redirect("/");

  return <div className="space-y-6">{children}</div>;
}
