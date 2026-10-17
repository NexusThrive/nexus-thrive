import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { getStaffContext } from "@/lib/ops/access";
import { billingSummary, getPolicy, listCharges, listSubscriptions, tenantsWithoutSubscription } from "@/lib/ops/billing";
import { todayBogota } from "@/lib/ops/leads";
import BillingView from "./_components/billing-view";

export const metadata: Metadata = { title: "Facturación · NEXUS Operations Center" };

/** Lo que los negocios le pagan a NEXUS: suscripciones, cobros y cobranza. */
export default async function FacturacionPage() {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("billing.view")) notFound();
  const [subs, charges, missing, policy] = await Promise.all([listSubscriptions(), listCharges(), tenantsWithoutSubscription(), getPolicy()]);
  const today = todayBogota();
  const p = staff.permissions;
  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Administración" title="Facturación" description="Suscripciones de los negocios a NEXUS THRIVE. Ningún pago se confirma sin comprobante." />
      <BillingView
        subs={subs}
        charges={charges}
        missing={missing.map((m) => ({ tenantId: m.id, name: m.name, plan: m.plan, billingCycle: m.billingCycle, monthlyCents: m.monthlyCents }))}
        policy={policy}
        summary={billingSummary(subs, charges, today)}
        perms={{ record: p.includes("billing.record"), refund: p.includes("billing.refund"), suspend: p.includes("accounts.suspend"), pricing: p.includes("pricing.edit") }}
        today={today}
      />
    </div>
  );
}
