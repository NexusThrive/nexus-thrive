"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import type { ModuleValue } from "@/lib/admin-catalogs";
import ProfileTab from "./profile-tab";
import ModulesTab from "./modules-tab";
import TeamTab from "./team-tab";
import PlanTab, { type PlanInfo } from "./plan-tab";
import NfcTab, { type CardOwner } from "./nfc-tab";
import { Blocks, CreditCard, Nfc, Palette, Store, Users } from "lucide-react";
import { SectionNav } from "@/components/molecules/section-nav";
import { PageHeader } from "@/components/molecules/page-header";
import { AppearanceSettings } from "@/components/organisms/appearance-settings";

export type RoleValue = "SUPERADMIN" | "OWNER" | "STAFF";

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

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: RoleValue;
};

export type SystemInfoItem = { label: string; value: string };
export type { CardOwner, PlanInfo };

type Tab = "profile" | "plan" | "modules" | "team" | "card" | "appearance";

const TABS = [
  { id: "profile", label: "Perfil del negocio", icon: Store, hint: "Nombre, enlace y contacto" },
  { id: "plan", label: "Plan", icon: CreditCard, hint: "Thrive y lo que incluye" },
  { id: "modules", label: "Módulos", icon: Blocks, hint: "Activa lo que usas" },
  { id: "team", label: "Equipo", icon: Users, hint: "Quién entra al negocio" },
  { id: "card", label: "Tarjeta NFC", icon: Nfc, hint: "Tu tarjeta de contacto" },
  { id: "appearance", label: "Apariencia", icon: Palette, hint: "Tema, densidad y movimiento" },
] as const satisfies readonly { id: Tab; label: string; icon: unknown; hint: string }[];

/**
 * Shell cliente del módulo de Ajustes: pestañas + provider de notificaciones.
 * Los datos llegan ya resueltos desde el Server Component de la página.
 */
export default function SettingsShell({
  tenantSlug: initialTenantSlug,
  canManage,
  profile,
  modules,
  team,
  systemInfo,
  plan,
  card,
}: {
  tenantSlug: string;
  canManage: boolean;
  profile: ProfileInitialValues;
  modules: ModuleState[];
  team: TeamMember[];
  systemInfo: SystemInfoItem[];
  plan: PlanInfo;
  card: CardOwner;
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
          description="Perfil, plan, módulos, equipo y apariencia de tu negocio."
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
          />
        )}
        {tab === "modules" && (
          <ModulesTab
            tenantSlug={currentSlug}
            canManage={canManage}
            modules={modules}
          />
        )}
        {tab === "plan" && <PlanTab info={plan} />}
        {tab === "team" && <TeamTab members={team} />}
        {tab === "card" && <NfcTab owner={card} />}
        {tab === "appearance" && <AppearanceSettings />}
        </div>
        </div>
    </div>
  );
}
