import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/core/auth/permissions";
import { requireTenantContext } from "@/lib/core/tenancy/context";
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
        <PermissionNotice permission="data.exchange" action="importar y exportar datos" />
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
