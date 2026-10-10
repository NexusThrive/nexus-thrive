import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { paymentMethodLabel } from "@/lib/finance";
import {
  MODULES,
  VERTICAL_LABELS,
  sortModules,
} from "@/lib/admin-catalogs";
import SettingsShell, {
  type ModuleState,
  type ProfileInitialValues,
  type SystemInfoItem,
  type TeamMember,
} from "./_components/settings-shell";

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

  const tenantRecord = await db.orm.public.Tenant
    .where({ slug: tenantSlug, active: true })
    .include("modules", (module) => module.select("moduleName", "active"))
    .first();

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

  const team: TeamMember[] = users
    .map((user) => ({
      id: user.id,
      name: user.name || "Sin nombre",
      email: user.email,
      role: user.role as TeamMember["role"],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

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

  return (
    <SettingsShell
      tenantSlug={tenantRecord.slug}
      canManage={canManage}
      profile={profile}
      modules={modules}
      team={team}
      systemInfo={systemInfo}
    />
  );
}
