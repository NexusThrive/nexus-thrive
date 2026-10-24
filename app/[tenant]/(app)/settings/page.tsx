import { consumptionFor } from "@/lib/usage/consumption-db";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { tenantWithModules } from "@/lib/tenant/membership";
import { createTenantDb } from "@/lib/tenant/db";
import { listTeam, seatLimit } from "@/lib/business/team-db";
import type { BusinessModel } from "@/lib/tenant/business-context";
import { listApiKeys } from "@/lib/api/keys";
import { canManageTeam } from "@/lib/business/roles";
import { paymentMethodLabel } from "@/lib/finance";
import { getTenantAccess } from "@/lib/benefits/benefits-db";
import {
  type VerticalValue,
  MODULES,
  VERTICAL_LABELS,
  sortModules,
} from "@/lib/admin/catalogs";
import SettingsShell, {
  type CardOwner,
  type PlanInfo,
  type ModuleState,
  type ProfileInitialValues,
  type SystemInfoItem,
} from "./_components/settings-shell";
import { requirePageContext } from "@/lib/tenant/context";

/**
 * Módulo de Ajustes del negocio (Server Component).
 *
 * El acceso (sesión, tenant activo y membresía) ya lo garantiza
 * `app/[tenant]/layout.tsx`. Aquí se resuelve el tenant y se cargan los datos
 * reales: perfil, estado de los 11 módulos, equipo e información del sistema.
 * Los formularios/acciones viven en componentes cliente bajo `_components/`.
 */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  // Sesión + negocio activo + membresía activa (SEC-03): no basta el layout.
  const pageCtx = await requirePageContext(tenantSlug);
  const tenantRecord = await tenantWithModules(pageCtx.tenantId);
  if (!tenantRecord) {
    notFound();
  }

  const tenantDb = createTenantDb(tenantRecord.id);

  const { userId } = await auth();
  const [users, localUser] = await Promise.all([
    tenantDb.users.list(),
    userId ? tenantDb.users.findByClerkUserId(userId) : Promise.resolve(null),
  ]);

  const canManage =
    localUser?.role === "OWNER" || localUser?.role === "SUPERADMIN";

  // Catálogo completo de módulos con su estado real (los no registrados = off).
  const activeByName = new Map(
    tenantRecord.modules.map((module) => [module.moduleName, module.active]),
  );
  const modules: ModuleState[] = sortModules(MODULES).map((moduleName) => ({
    moduleName,
    active: activeByName.get(moduleName) ?? false,
  }));

  const profile: ProfileInitialValues = {
    name: tenantRecord.name,
    slug: tenantRecord.slug,
    city: tenantRecord.city ?? "",
    address: tenantRecord.address ?? "",
    taxId: tenantRecord.taxId ?? "",
    phone: tenantRecord.whatsappNumber ?? "",
  };

  const [teamData, seats] = await Promise.all([listTeam(tenantRecord.id, localUser?.id ?? ""), seatLimit(tenantRecord.id)]);
  void users;
  const team = { ...teamData, seats, canManage: !!localUser && canManageTeam(localUser.role), meRole: localUser?.role ?? "STAFF" };

  const paymentMethods = (tenantRecord.paymentMethods ?? [])
    .map((method) => paymentMethodLabel(method))
    .join(", ");

  const systemInfo: SystemInfoItem[] = [
    { label: "Vertical", value: VERTICAL_LABELS[tenantRecord.vertical] },
    { label: "Estado", value: tenantRecord.active ? "Activo" : "Suspendido" },
    {
      label: "Onboarding",
      value: tenantRecord.onboardingCompleted ? "Completo" : "Pendiente",
    },
    {
      label: "Métodos de pago",
      value: paymentMethods || "Sin configurar",
    },
  ];

  const plan: PlanInfo = {
    plan: tenantRecord.plan,
    billing: tenantRecord.billingCycle,
    monthlyUsdCents: tenantRecord.planMonthlyUsdCents,
    selectedAt: tenantRecord.planSelectedAt ? String(tenantRecord.planSelectedAt) : null,
    activeModules: modules.filter((m) => m.active).map((m) => m.moduleName),
    access: await getTenantAccess(tenantRecord.id),
    usage: await consumptionFor(tenantRecord.id),
  };

  const ROLE_LABELS = { OWNER: "Propietario", STAFF: "Equipo", SUPERADMIN: "Administrador" } as const;
  const card: CardOwner = {
    name: localUser?.name?.trim() || "Tu nombre",
    role: `${ROLE_LABELS[(localUser?.role as keyof typeof ROLE_LABELS) ?? "OWNER"] ?? "Propietario"} · ${tenantRecord.name}`,
    code: `NT-${tenantRecord.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`,
  };

  const apiKeys = team.canManage ? await listApiKeys(tenantRecord.id) : [];

  return (
    <SettingsShell
      tenantSlug={tenantRecord.slug}
      canManage={canManage}
      profile={profile}
      modules={modules}
      team={team}
      apiKeys={apiKeys}
      systemInfo={systemInfo}
      plan={plan}
      card={card}
      context={{ vertical: tenantRecord.vertical as VerticalValue, businessModels: (tenantRecord.businessModels ?? []) as BusinessModel[], activity: tenantRecord.activity ?? "" }}
    />
  );
}
