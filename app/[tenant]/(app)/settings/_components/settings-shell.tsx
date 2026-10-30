"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import type { ModuleValue } from "@/lib/admin/catalogs";
import ProfileTab from "./profile-tab";
import TeamTab, { type Seats } from "./team-tab";
import type { PendingInvite, TeamMember as BusinessMember } from "@/lib/business/team-db";
import PlanTab, { type PlanInfo } from "./plan-tab";
import DangerTab from "./danger-tab";
import AccountTab, { type MyAccount } from "./account-tab";
import { CreditCard, Palette, Store, TriangleAlert, UserRound, Users } from "lucide-react";
import { SectionNav } from "@/components/molecules/section-nav";
import { PageHeader } from "@/components/molecules/page-header";
import type { VerticalValue } from "@/lib/admin/catalogs";
import type { BusinessModel } from "@/lib/tenant/business-context";
import { AppearanceSettings } from "@/components/organisms/appearance-settings";


export type ProfileInitialValues = {
  name: string;
  slug: string;
  city: string;
  address: string;
  taxId: string;
  phone: string;
};

export type ModuleState = {
  moduleName: ModuleValue;
  active: boolean;
};


export type SystemInfoItem = { label: string; value: string };
export type { PlanInfo };

type Tab = "profile" | "plan" | "team" | "account" | "appearance" | "danger";

/** Agrupadas por propósito: la organización, las personas, lo personal y lo irreversible. */
const TABS = [
  { id: "profile", label: "Perfil del negocio", icon: Store, hint: "Nombre, contacto y datos fiscales", group: "Organización" },
  { id: "plan", label: "Plan y consumo", icon: CreditCard, hint: "Tu plan y lo que has usado", group: "Organización" },
  { id: "team", label: "Equipo y permisos", icon: Users, hint: "Quién entra y con qué rol", group: "Personas" },
  { id: "account", label: "Mi cuenta", icon: UserRound, hint: "Tus datos en este negocio", group: "Preferencias personales" },
  { id: "appearance", label: "Apariencia", icon: Palette, hint: "Tema, densidad y movimiento", group: "Preferencias personales" },
  { id: "danger", label: "Zona de peligro", icon: TriangleAlert, hint: "Eliminar el negocio", group: "Zona de peligro" },
] as const satisfies readonly { id: Tab; label: string; icon: unknown; hint: string; group: string }[];

/**
 * Shell cliente del módulo de Ajustes: pestañas + provider de notificaciones.
 * Los datos llegan ya resueltos desde el Server Component de la página.
 */
export default function SettingsShell({
  tenantSlug: initialTenantSlug,
  canManage,
  profile,
  team,
  systemInfo,
  plan,
  context,
  me,
}: {
  tenantSlug: string;
  canManage: boolean;
  profile: ProfileInitialValues;
  team: { members: BusinessMember[]; invites: PendingInvite[]; seats: Seats; canManage: boolean; meRole: string };
  systemInfo: SystemInfoItem[];
  plan: PlanInfo;
  context: { vertical: VerticalValue; businessModels: BusinessModel[]; activity: string };
  me: MyAccount;
}) {
  const params = useParams();
  const currentSlug = Array.isArray(params?.tenant)
    ? params.tenant[0]
    : (params?.tenant ?? initialTenantSlug);

  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="w-full">
        <PageHeader
          eyebrow="Sistema"
          title="Ajustes"
          description="Los datos de tu negocio, las personas que lo usan y tus preferencias."
        />

        <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
        <SectionNav ariaLabel="Secciones de ajustes" items={TABS} value={tab} onChange={setTab} />
        <div key={tab} className="nx-rise min-w-0">
        {tab === "profile" && (
          <ProfileTab
            tenantSlug={currentSlug}
            canManage={canManage}
            initialValues={profile}
            systemInfo={systemInfo}
            context={context}
          />
        )}
        {tab === "plan" && <PlanTab info={plan} />}
        {tab === "team" && <TeamTab slug={initialTenantSlug} {...team} />}
        {tab === "account" && <AccountTab slug={initialTenantSlug} me={me} />}
        {tab === "appearance" && <AppearanceSettings />}
        {tab === "danger" && <DangerTab slug={initialTenantSlug} canManage={canManage} />}
        </div>
        </div>
    </div>
  );
}
