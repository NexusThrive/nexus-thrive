import { notFound } from "next/navigation";
import {
  CircleDollarSign,
  Clock,
  CreditCard,
  Receipt,
  Wallet,
} from "lucide-react";
import { db } from "@/prisma/db";
import {
  createTenantDb,
  type CustomerAccountStatus,
} from "@/lib/tenant-db";
import { getVerticalTerms } from "@/lib/vertical-terms";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/finance";
import CustomerHeader from "./_components/customer-header";
import KpiCard from "./_components/kpi-card";
import ProfileTabs, {
  type ProfileTab,
  type ProfileTabKey,
} from "./_components/profile-tabs";
import TimelinePanel from "./_components/timeline";
import PaymentsTable from "./_components/payments-table";
import MembershipsTable from "./_components/memberships-table";
import NotesPanel from "./_components/notes-panel";
import AccountSummaryCard from "./_components/account-summary-card";
import { ACCOUNT_STATUS_LABELS } from "./_components/status-pills";

const ACCOUNT_STATUS_TONE: Record<CustomerAccountStatus, "emerald" | "amber" | "rose" | "slate"> = {
  al_dia: "emerald",
  pendiente: "amber",
  vencido: "rose",
  sin_actividad: "slate",
  sin_datos: "slate",
};

/**
 * FICHA DEL CLIENTE 360° — vista centralizada de un cliente.
 *
 * Server Component: toda la carga inicial ocurre en el servidor vía
 * `customers.get360Details`, que verifica que el `customerId` pertenece a
 * ESTE tenant (Multi-Tenancy estricta: Clerk → tenant → tenantId →
 * customerId → tenantDb). Client Components solo para lo interactivo
 * (pestañas = links a `?tab=`, notas con Server Action).
 */
export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const sp = await searchParams;
  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;

  const tenantRecord = await db.orm.public.Tenant
    .where({ slug: tenantSlug, active: true })
    .include("modules", (module) => module.select("moduleName", "active"))
    .first();
  if (!tenantRecord) {
    notFound();
  }

  // Devuelve `null` si el cliente no existe o es de otro tenant → 404.
  const tenantDb = createTenantDb(tenantRecord.id);
  const details = await tenantDb.customers.get360Details(id);
  if (!details) {
    notFound();
  }

  const terms = getVerticalTerms(tenantRecord.vertical);
  const {
    customer,
    payments,
    paymentsTotal,
    memberships,
    notes,
    timeline,
    metrics,
  } = details;

  // Tabs según módulos ACTIVOS del tenant (spec: no mostrar pestañas de
  // módulos inactivos; no existen modelos Order/Booking en el schema).
  const activeModules = new Set(
    tenantRecord.modules
      .filter((module) => module.active)
      .map((module) => module.moduleName),
  );
  const showPayments =
    activeModules.has("payments") || activeModules.has("finance");
  const showMemberships = activeModules.has("memberships");

  const tabs: ProfileTab[] = [
    { key: "resumen", label: "Resumen" },
    ...(showPayments ? [{ key: "pagos" as const, label: "Pagos" }] : []),
    ...(showMemberships
      ? [{ key: "membresias" as const, label: terms.items }]
      : []),
    { key: "notas", label: "Notas" },
  ];

  const activeTab: ProfileTabKey = tabs.some((tab) => tab.key === tabRaw)
    ? (tabRaw as ProfileTabKey)
    : "resumen";

  const baseHref = `/${tenantSlug}/crm/${customer.id}`;

  const latestActiveMembership =
    memberships.find((membership) => membership.status !== "expired") ?? null;

  const latestActivityTitle = timeline[0]?.title;

  return (
    <div className="space-y-6">
      <CustomerHeader
        tenantSlug={tenantSlug}
        tenantName={tenantRecord.name}
        customer={customer}
        terms={terms}
      />

      <section
        aria-label="Métricas del cliente"
        className="grid grid-cols-2 gap-3 lg:grid-cols-5"
      >
        <KpiCard
          title="Total facturado"
          value={formatCurrency(metrics.ltv)}
          description={`${metrics.approvedCount} ${metrics.approvedCount === 1 ? "pago aprobado" : "pagos aprobados"}`}
          icon={Wallet}
          tone="indigo"
        />
        <KpiCard
          title="Última actividad"
          value={
            metrics.lastActivityDate
              ? formatDateTime(metrics.lastActivityDate)
              : "Sin actividad"
          }
          description={latestActivityTitle}
          icon={Clock}
          tone="slate"
        />
        <KpiCard
          title="Estado de cuenta"
          value={ACCOUNT_STATUS_LABELS[metrics.accountStatus]}
          description="Basado en pagos y membresías"
          icon={CircleDollarSign}
          tone={ACCOUNT_STATUS_TONE[metrics.accountStatus]}
        />
        <KpiCard
          title="Ticket promedio"
          value={formatCurrency(metrics.avgTicket)}
          description="Por pago aprobado"
          icon={Receipt}
          tone="slate"
        />
        <KpiCard
          title="Método favorito"
          value={
            metrics.favoriteMethod
              ? paymentMethodLabel(metrics.favoriteMethod)
              : "Sin datos"
          }
          description="Entre pagos aprobados"
          icon={CreditCard}
          tone="slate"
        />
      </section>

      <ProfileTabs baseHref={baseHref} tabs={tabs} activeTab={activeTab} />

      {activeTab === "resumen" ? (
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Timeline 360°
            </h2>
            <TimelinePanel
              events={timeline}
              emptyText={`Sin actividad registrada para este ${terms.customer.toLowerCase()}.`}
            />
          </div>
          <AccountSummaryCard
            customer={customer}
            metrics={metrics}
            paymentsTotal={paymentsTotal}
            approvedCount={metrics.approvedCount}
            latestActiveMembership={latestActiveMembership}
            showMemberships={showMemberships}
            terms={terms}
          />
        </section>
      ) : null}

      {activeTab === "pagos" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Historial de pagos
          </h2>
          <PaymentsTable payments={payments} total={paymentsTotal} />
        </section>
      ) : null}

      {activeTab === "membresias" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            {terms.items}
          </h2>
          <MembershipsTable memberships={memberships} terms={terms} />
        </section>
      ) : null}

      {activeTab === "notas" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Notas</h2>
          <NotesPanel
            tenantSlug={tenantSlug}
            customerId={customer.id}
            initialNotes={notes}
          />
        </section>
      ) : null}
    </div>
  );
}