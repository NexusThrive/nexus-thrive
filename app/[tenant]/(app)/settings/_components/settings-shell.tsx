"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { cn } from "@/lib/cn";
import { ToastProvider } from "@/components/molecules/toast";
import type { ModuleValue } from "@/lib/admin-catalogs";
import ProfileTab from "./profile-tab";
import ModulesTab from "./modules-tab";
import TeamTab from "./team-tab";

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

type Tab = "profile" | "modules" | "team";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Perfil del negocio" },
  { id: "modules", label: "Módulos activos" },
  { id: "team", label: "Equipo" },
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
    <ToastProvider>
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Ajustes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura el perfil, los módulos y el equipo de tu negocio.
          </p>
        </header>

        <div className="mb-6 flex gap-1 border-b border-border">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={cn(
                "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === item.id
                  ? "border-primary text-foreground"
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
      </div>
    </ToastProvider>
  );
}
