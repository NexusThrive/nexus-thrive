import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { db } from "@/prisma/db";
import ImportWorkspace from "./_components/import-workspace";

/**
 * Importador inteligente de APUs e insumos.
 *
 * Fase 1 (preview en memoria, sin DB) y Fase 2 (importación transaccional)
 * viven en `actions.ts`; esta página es un shell server que pasa el contexto
 * del tenant al workspace cliente.
 */
export default async function ImportPage({
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <Link
          href={`/${tenantSlug}/catalog`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground/80"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver al catálogo APU
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold-100 text-gold-700">
            <UploadCloud aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-[clamp(24px,4.4vw,34px)] font-bold leading-[1.12] tracking-[-0.02em] text-foreground">
              Importar catálogo
            </h1>
            <p className="text-sm text-muted-foreground">
              Sube un Excel o CSV de insumos (o un pack APU completo): el
              sistema detecta columnas, categorías y anomalías antes de escribir
              en la base, y todo se importa de una sola vez.
            </p>
          </div>
        </div>
      </header>

      <ImportWorkspace tenantSlug={tenantSlug} />
    </div>
  );
}