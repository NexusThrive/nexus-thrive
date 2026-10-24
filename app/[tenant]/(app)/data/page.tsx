import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/business/permissions";
import { requireTenantContext } from "@/lib/tenant/context";
import DataExchange from "./_components/data-exchange";

/**
 * Importar y exportar: clientes y catálogo desde Excel/CSV con revisión antes
 * de guardar, y copias para descargar. Función base: no depende del rubro.
 */
export default async function DataPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant);
  if (!ctx) notFound();
  const header = <PageHeader eyebrow="Sistema" title="Importar y exportar" description="Sube tus clientes y tu catálogo desde Excel o CSV, o descarga una copia." />;
  if (!can(ctx.role, "data.exchange")) {
    return (
      <div className="grid gap-5">
        {header}
        <Alert tone="info">Solo el dueño o administración puede importar y exportar datos.</Alert>
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {header}
      <DataExchange slug={tenant} />
    </div>
  );
}
