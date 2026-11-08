import { redirect } from "next/navigation";

/** El punto de venta vive en `/pos`. Esta ruta se conserva para los enlaces y marcadores de antes. */
export default async function LegacyPosPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  redirect(`/${tenant}/pos`);
}
