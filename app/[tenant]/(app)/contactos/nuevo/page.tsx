import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVerticalTerms } from "@/lib/core/sectors/terms";
import { isRouteEnabled, requirePageContext } from "@/lib/core/tenancy/context";
import NewCustomerForm from "./_components/new-customer-form";

export const metadata: Metadata = { title: "Nuevo cliente" };

/** Alta completa de un cliente: identidad, contacto, ubicación y datos opcionales; a la derecha, la vista previa en vivo. */
export default async function NewCustomerPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requirePageContext(tenant, "/contactos");
  if (!ctx) notFound();
  const terms = getVerticalTerms(ctx.vertical);
  const canBook = await isRouteEnabled(ctx.tenantId, "/bookings");
  return <NewCustomerForm slug={tenant} customersLabel={terms.customers} canBook={canBook} />;
}
