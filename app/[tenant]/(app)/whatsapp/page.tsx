import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";
import { PageHeader } from "@/components/molecules/page-header";
import { WhatsAppComposer } from "@/components/organisms/whatsapp-composer";

/**
 * Módulo WhatsApp: clientes activos con teléfono, plantillas y envío por
 * WhatsApp (abre la conversación con el texto listo). La integración con la
 * API de WhatsApp Business (mensajes entrantes) sigue en el roadmap.
 */
export default async function WhatsAppPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  const tenantRecord = await db.orm.public.Tenant.where({ slug: tenantSlug, active: true }).first();
  if (!tenantRecord) notFound();

  const customers = await createTenantDb(tenantRecord.id).customers.search({ status: "active", pageSize: 200 });
  const contacts = customers.rows
    .filter((c) => (c.phone ?? "").replace(/\D/g, "").length >= 7)
    .map((c) => ({ id: c.id, name: c.name, phone: c.phone ?? "" }));

  return (
    <div>
      <PageHeader eyebrow="Gestión" title="WhatsApp" description="Escríbele a tus clientes con plantillas listas: el mensaje se abre en WhatsApp." />
      <WhatsAppComposer contacts={contacts} businessName={tenantRecord.name} storageKey={`nx:wa-sent:${tenantRecord.slug}`} />
    </div>
  );
}
