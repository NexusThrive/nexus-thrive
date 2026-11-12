import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KpiCard } from "@/components/widgets/kpi-card";
import { PageHeader } from "@/components/molecules/page-header";
import { solutionReport } from "@/lib/platform/admin/solutions-db";
import { getStaffContext } from "@/lib/platform/team/access";
import SolutionsView from "./_components/solutions-view";

export const metadata: Metadata = { title: "Soluciones · NEXUS Operations Center" };

/**
 * Solución de cada negocio (ADR 0007, HU-transicion-01). Por defecto sale del rubro; aquí se revisan a mano los casos
 * dudosos (rubros ambiguos o negocios que usan funciones fuera de su solución). Nada se oculta ni se migra.
 */
export default async function SolucionesPage() {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("accounts.view")) notFound();
  const rows = await solutionReport();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader eyebrow="Cuentas" title="Soluciones" description="La solución de cada negocio sale de su rubro. Revisa a mano los casos dudosos: ningún negocio pierde lo que ya usa." />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard label="Negocios" value={rows.length} index={0} />
        <KpiCard label="Por revisar" value={rows.filter((r) => r.doubtful).length} alert={rows.some((r) => r.doubtful)} index={1} />
        <KpiCard label="Fijados a mano" value={rows.filter((r) => r.source === "manual").length} index={2} />
        <KpiCard label="Usan funciones de otra solución" value={rows.filter((r) => r.outside.length > 0).length} index={3} />
      </div>
      <SolutionsView rows={rows} canEdit={!!staff.permissions.includes("accounts.modules")} />
    </div>
  );
}
