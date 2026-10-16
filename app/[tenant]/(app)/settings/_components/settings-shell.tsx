"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { cn } from "@/lib/cn";
import type { ModuleValue } from "@/lib/admin-catalogs";
import ProfileTab from "./profile-tab";
import ModulesTab from "./modules-tab";
import TeamTab from "./team-tab";
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

type Tab = "profile" | "modules" | "team" | "appearance";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Perfil del negocio" },
  { id: "modules", label: "Módulos activos" },
  { id: "team", label: "Equipo" },
  { id: "appearance", label: "Apariencia" },
];

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
}: {
  tenantSlug: string;
  canManage: boolean;
  profile: ProfileInitialValues;
  modules: ModuleState[];
  team: TeamMember[];
  systemInfo: SystemInfoItem[];
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
          description="Configura el perfil, los módulos, el equipo y la apariencia de tu negocio."
        />

        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === item.id
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

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
        {tab === "team" && <TeamTab members={team} />}
        {tab === "appearance" && <AppearanceSettings />}
    </div>
  );
}
