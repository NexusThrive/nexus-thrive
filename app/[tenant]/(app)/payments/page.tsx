import { redirect } from "next/navigation";

/** El módulo Pagos vive en Finanzas → Cobros (un solo lugar para el dinero). */
export default async function PaymentsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  redirect(`/${tenant}/finance?tab=cobros`);
}
