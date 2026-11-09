import { requirePageContext } from "@/lib/core/tenancy/context";
import ReceiptPage from "@/app/[tenant]/(app)/pos/receipt/[id]/page";

/** Comprobante del punto de venta: vive en `/pos/receipt/[id]`. Esta ruta muestra lo mismo (sin redirigir, para no entrar en bucle con redirecciones guardadas). */
export default async function LegacyPosReceiptPage(props: Parameters<typeof ReceiptPage>[0]) {
  await requirePageContext((await props.params).tenant, "/pos");
  return ReceiptPage(props);
}
