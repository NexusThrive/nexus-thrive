import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { getStaffContext } from "@/lib/ops/access";
import { loadPricingConfig } from "@/lib/plans/settings";
import CatalogTabs from "./_components/catalog-tabs";

export const metadata: Metadata = { title: "Planes y módulos · NEXUS Operations Center" };

/**
 * Catálogo comercial: planes, módulos, rubros y tramos de clientes. El
 * onboarding y el cálculo de precios del servidor leen de aquí. Precios con
 * pricing.edit; estructura (estados, rubros, módulos permitidos) con
 * catalog.edit. Todo cambio queda en la auditoría.
 */
export default async function PlanesPage() {
  const staff = await getStaffContext();
  const canPrice = !!staff?.permissions.includes("pricing.edit");
  const canStructure = !!staff?.permissions.includes("catalog.edit");
  if (!canPrice && !canStructure) notFound();
  const config = await loadPricingConfig();
  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Administración"
        title="Planes y módulos"
        description="Precios, planes, módulos y rubros que ve cada negocio al registrarse. Los cambios aplican de inmediato a los registros nuevos."
      />
      <CatalogTabs config={config} canPrice={canPrice} canStructure={canStructure} />
    </div>
  );
}
