import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/molecules/page-header";
import { isVertical, VERTICAL_LABELS } from "@/lib/admin/catalogs";
import { getStaffContext } from "@/lib/ops/access";
import { listManagers } from "@/lib/ops/accounts";
import { getLead, listLeadActivity, tenantOptions, todayBogota } from "@/lib/ops/leads";
import LeadDetail from "./_components/lead-detail";

export const metadata: Metadata = { title: "Lead · NEXUS Operations Center" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("leads.view")) notFound();
  const [lead, activity, owners, tenants] = await Promise.all([getLead(id), listLeadActivity(id), listManagers(), tenantOptions()]);
  if (!lead) notFound();
  return (
    <div className="grid gap-5">
      <Link href="/admin/crm" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-3.5" /> CRM comercial
      </Link>
      <PageHeader eyebrow="Lead" title={lead.company} description={[lead.contactName, lead.phone, lead.email].filter(Boolean).join(" · ") || undefined} />
      <LeadDetail
        lead={lead}
        activity={activity}
        owners={owners}
        tenants={tenants}
        me={staff.staffId}
        today={todayBogota()}
        canEdit={staff.permissions.includes("leads.edit")}
        canAssign={staff.permissions.includes("leads.assign")}
        verticalLabel={lead.vertical && isVertical(lead.vertical) ? VERTICAL_LABELS[lead.vertical] : null}
        tenantName={tenants.find((t) => t.id === lead.tenantId)?.name ?? null}
      />
    </div>
  );
}
