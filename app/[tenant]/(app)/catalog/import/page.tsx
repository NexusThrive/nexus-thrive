import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import ImportWorkspace from "./_components/import-workspace";
import { PageHeader } from "@/components/molecules/page-header";
import { requirePageContext } from "@/lib/tenant/context";

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

  // Sesión + negocio activo + membresía activa (SEC-03): no basta el layout.
  await requirePageContext(tenantSlug, "/catalog");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo APU"
        title="Importar catálogo"
        description="Sube un Excel o CSV de insumos (o un pack APU completo): el
              sistema detecta columnas, categorías y anomalías antes de escribir
              en la base, y todo se importa de una sola vez."
        actions={
          <Link href={`/${tenantSlug}/catalog`} className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Volver al catálogo APU
          </Link>
        }
      />

      <ImportWorkspace tenantSlug={tenantSlug} />
    </div>
  );
}