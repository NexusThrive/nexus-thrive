import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";
import { getVerticalTerms } from "@/lib/vertical-terms";
import { bmi, profileFor } from "@/lib/business/customer-fields";
import CustomerHeader from "./_components/customer-header";
import MembershipHighlight from "./_components/membership-highlight";
import AgeText from "./_components/age-text";
import FinanceSummary from "./_components/finance-summary";
import InfoCard from "./_components/info-card";
import AlertsCard, { type SummaryAlert } from "./_components/alerts-card";
import ProfileTabs, {
  type ProfileTab,
  type ProfileTabKey,
} from "./_components/profile-tabs";
import TimelinePanel from "./_components/timeline";
import PaymentsTable from "./_components/payments-table";
import MembershipsTable from "./_components/memberships-table";
import NotesPanel from "./_components/notes-panel";
import AccessCard from "./_components/access-card";
import { memberStatus } from "@/lib/business/gym-db";

/**
 * FICHA DEL CLIENTE 360° — expediente centralizado de un cliente.
 *
 * Server Component: toda la carga inicial ocurre en el servidor vía
 * `customers.get360Details`, que verifica que el `customerId` pertenece a
 * ESTE tenant (Multi-Tenancy estricta: Clerk → tenant → tenantId →
 * customerId → tenantDb). Client Components solo para lo interactivo
 * (pestañas = links a `?tab=`, notas, acceso y edición con Server Actions).
 *
 * Dos estados que NO se mezclan: el estado de CUENTA (pagos) y el estado de
 * la MEMBRESÍA (vigencia). Y dos hechos que tampoco: el último MOVIMIENTO
 * (puede estar anulado) y el último PAGO APROBADO (dinero que entró).
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
    { key: "timeline", label: "Timeline 360°" },
  ];

  const activeTab: ProfileTabKey = tabs.some((tab) => tab.key === tabRaw)
    ? (tabRaw as ProfileTabKey)
    : "resumen";

  const baseHref = `/${tenantSlug}/crm/${customer.id}`;
  const extra = await db.orm.public.Customer.where({ tenantId: tenantRecord.id, id: customer.id }).select("profile", "documentId", "birthDate", "city", "tags", "photoId", "accessCode", "nfcUid").first();
  const isGym = tenantRecord.vertical === "gym" && showMemberships;
  const access = isGym ? await memberStatus(tenantRecord.id, customer.id) : null;

  const def = profileFor(tenantRecord.vertical);
  const profile = (extra?.profile as Record<string, string | number> | null) ?? {};

  // Membresía destacada: la vigente/por vencer; si no, la última registrada.
  // (corrección: el estado de membresía es distinto del estado de cuenta)
  const highlightedMembership =
    memberships.find((membership) => membership.status !== "expired") ??
    memberships[0] ??
    null;

  // (corrección: "último movimiento" ≠ "último pago aprobado")
  const lastMovement = timeline[0] ?? null;
  const lastApprovedPayment =
    payments.find((payment) => payment.status === "APPROVED") ?? null;

  const birthDate = extra?.birthDate ? String(extra.birthDate).slice(0, 10) : null;

  const personalRows: [string, ReactNode][] = [
    [def.documentLabel, extra?.documentId ?? ""],
    ["Edad", birthDate ? <AgeText birthDate={birthDate} /> : ""],
    ["Ciudad", extra?.city ?? ""],
    ["Correo", customer.email ?? ""],
    ["Teléfono", customer.phone ?? ""],
    ["Etiquetas", extra?.tags?.length ? extra.tags.join(", ") : ""],
  ];

  // Datos propios del rubro, sin el contacto de emergencia (va en su tarjeta).
  const physicalRows: [string, string][] = def.fields
    .filter((field) => field.key !== "emergencyName" && field.key !== "emergencyPhone")
    .map((field) => {
      const value = profile[field.key];
      return [
        field.label,
        value != null && value !== ""
          ? `${value}${field.type === "number" ? ` ${field.unit}` : ""}`
          : "",
      ];
    });
  const b = bmi(
    Number(profile.weightKg) || undefined,
    Number(profile.heightCm) || undefined,
  );
  const physicalTitle =
    tenantRecord.vertical === "gym"
      ? "Datos físicos y objetivo"
      : def.fields.length
        ? def.title
        : "Datos adicionales";

  const emergencyRows: [string, string][] = [
    ["Contacto", typeof profile.emergencyName === "string" ? profile.emergencyName : ""],
    ["Teléfono", typeof profile.emergencyPhone === "string" ? profile.emergencyPhone : ""],
  ].filter(([, value]) => value) as [string, string][];

  const pendingCount = payments.filter((payment) => payment.status === "PENDING").length;
  const alerts: SummaryAlert[] = [];
  if (metrics.accountStatus === "vencido") {
    alerts.push({ tone: "danger", text: "Cuenta vencida: revisa los pagos o la membresía." });
  } else if (metrics.accountStatus === "pendiente") {
    alerts.push({ tone: "warning", text: "Cuenta con pagos pendientes." });
  }
  if (pendingCount > 0) {
    alerts.push({
      tone: "warning",
      text: `${pendingCount} ${pendingCount === 1 ? "pago" : "pagos"} en estado pendiente.`,
    });
  }
  if (showMemberships) {
    if (!highlightedMembership || highlightedMembership.status === "expired") {
      alerts.push({ tone: "danger", text: `Sin ${terms.item.toLowerCase()} activa.` });
    } else if (highlightedMembership.status === "expiring") {
      alerts.push({ tone: "warning", text: `${terms.item} por vencer.` });
    }
  }
  if (isGym && !extra?.accessCode) {
    alerts.push({ tone: "muted", text: "Sin código de acceso (QR) asignado." });
  }
  if (!customer.active) {
    alerts.push({ tone: "muted", text: "La ficha está archivada." });
  }

  return (
    // Los gestores de contraseñas añaden atributos al DOM antes de que React
    // hidrate: sin esto aparece un aviso de hydration mismatch que no es
    // nuestro (la ficha 360 tiene varios formularios).
    <div className="space-y-5" suppressHydrationWarning>
      <CustomerHeader
        tenantSlug={tenantSlug}
        tenantName={tenantRecord.name}
        customer={customer}
        terms={terms}
        photoId={extra?.photoId ?? null}
        accountStatus={metrics.accountStatus}
        membership={highlightedMembership}
        showMemberships={showMemberships}
      />

      <section
        aria-label="Resumen financiero y de membresía"
        className={showMemberships ? "grid gap-5 lg:grid-cols-3" : ""}
      >
        {showMemberships ? (
          <MembershipHighlight
            membership={highlightedMembership}
            terms={terms}
            baseHref={baseHref}
            className="lg:col-span-2"
          />
        ) : null}
        <FinanceSummary
          metrics={metrics}
          paymentsTotal={paymentsTotal}
          lastMovement={lastMovement}
          lastApprovedPayment={lastApprovedPayment}
        />
      </section>

      <ProfileTabs
        baseHref={baseHref}
        tabs={tabs}
        activeTab={activeTab}
      />

      {activeTab === "resumen" ? (
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="grid content-start gap-5 lg:col-span-2">
            <InfoCard title="Datos personales" rows={personalRows} />
            {physicalRows.some(([, value]) => value) || b ? (
              <InfoCard
                title={physicalTitle}
                rows={physicalRows}
                emptyText="Sin datos adicionales."
                footer={
                  b ? (
                    <p className="text-xs text-muted-foreground">
                      IMC {b.value.toLocaleString("es-CO")} · {b.label}
                    </p>
                  ) : null
                }
              />
            ) : null}
            {emergencyRows.length ? (
              <InfoCard title="Contacto de emergencia" rows={emergencyRows} />
            ) : null}
            {access ? (
              <AccessCard
                slug={tenantSlug}
                customerId={customer.id}
                code={extra?.accessCode ?? null}
                nfcUid={extra?.nfcUid ?? null}
                status={access}
              />
            ) : null}
          </div>

          <div className="grid content-start gap-5">
            <AlertsCard alerts={alerts} />
            <div className="grid gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Últimos movimientos
              </h2>
              <TimelinePanel
                events={timeline.slice(0, 6)}
                emptyText={`Sin actividad registrada para este ${terms.customer.toLowerCase()}.`}
              />
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "pagos" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Historial de pagos
          </h2>
          <PaymentsTable payments={payments} total={paymentsTotal} />
        </section>
      ) : null}

      {activeTab === "membresias" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            {terms.items}
          </h2>
          <MembershipsTable memberships={memberships} terms={terms} />
        </section>
      ) : null}

      {activeTab === "notas" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Notas</h2>
          <NotesPanel
            tenantSlug={tenantSlug}
            customerId={customer.id}
            initialNotes={notes}
          />
        </section>
      ) : null}

      {activeTab === "timeline" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Timeline 360°
          </h2>
          <TimelinePanel
            events={timeline}
            emptyText={`Sin actividad registrada para este ${terms.customer.toLowerCase()}.`}
          />
        </section>
      ) : null}
    </div>
  );
}
