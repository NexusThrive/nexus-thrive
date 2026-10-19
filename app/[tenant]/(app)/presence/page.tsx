import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/prisma/db";
import { PageHeader } from "@/components/molecules/page-header";
import { loadPresence } from "@/lib/presence/load";
import PresencePanel from "../_components/presence-panel";

/**
 * Presence Thrive (página completa). Aquí vive todo el detalle —puntaje por
 * criterio, canales, vista previa del sitio y reanálisis—; el panel solo
 * muestra el porcentaje y enlaza aquí. El acceso ya lo garantiza
 * `app/[tenant]/layout.tsx` (sesión, tenant activo y membresía).
 */
export default async function PresencePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();

  if (!tenantRecord) {
    notFound();
  }

  const presence = await loadPresence(tenantRecord);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        eyebrow="Presencia digital"
        title="Presence Thrive"
        description="Tu puntaje, tus canales y tu página en un solo lugar."
        actions={
          <Link
            href={`/${tenantSlug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Volver al panel
          </Link>
        }
      />
      <PresencePanel
        tenantSlug={tenantSlug}
        presence={presence}
        settingsHref={`/${tenantSlug}/settings`}
      />
    </div>
  );
}
