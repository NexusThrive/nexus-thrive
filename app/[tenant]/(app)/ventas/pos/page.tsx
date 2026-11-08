import { requirePageContext } from "@/lib/core/tenancy/context";
import PosPage from "@/app/[tenant]/(app)/pos/page";

/**
 * El punto de venta vive en `/pos`. Esta ruta se conserva para los enlaces y marcadores de antes: muestra lo mismo en vez de
 * redirigir, porque los navegadores que guardaron la redirección permanente de `/pos` hacia aquí entrarían en bucle.
 */
export default async function LegacyPosPage(props: { params: Promise<{ tenant: string }> }) {
  await requirePageContext((await props.params).tenant, "/pos");
  return PosPage(props);
}
