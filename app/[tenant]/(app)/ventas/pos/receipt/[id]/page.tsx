import { redirect } from "next/navigation";

/** Comprobante del punto de venta: ahora en `/pos/receipt/[id]`. Se conserva para los enlaces de antes. */
export default async function LegacyPosReceiptPage({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant, id } = await params;
  redirect(`/${tenant}/pos/receipt/${id}`);
}
