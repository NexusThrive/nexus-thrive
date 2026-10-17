import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { getStaffContext } from "@/lib/ops/access";
import { listManagers } from "@/lib/ops/accounts";
import { listLeads, tenantOptions, todayBogota } from "@/lib/ops/leads";
import CrmView from "./_components/crm-view";

export const metadata: Metadata = { title: "CRM comercial · NEXUS Operations Center" };

/** Embudo comercial de NEXUS: de lead nuevo a negocio ganado. */
export default async function CrmPage() {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("leads.view")) notFound();
  const [leads, owners, tenants] = await Promise.all([listLeads(), listManagers(), tenantOptions()]);
  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Operaciones" title="CRM comercial" description="Prospectos de NEXUS por etapa. Cada lead activo tiene responsable y próximo paso con fecha." />
      <CrmView
        leads={leads}
        owners={owners}
        tenants={tenants}
        me={staff.staffId}
        today={todayBogota()}
        canEdit={staff.permissions.includes("leads.edit")}
        canAssign={staff.permissions.includes("leads.assign")}
      />
    </div>
  );
}
