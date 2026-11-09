"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import type { ModuleValue } from "@/lib/core/capabilities/modules";
import ProfileTab from "./profile-tab";
import TeamTab, { type Seats } from "./team-tab";
import type { PendingInvite, TeamMember as BusinessMember } from "@/lib/core/tenancy/team-db";
import PlanTab, { type PlanInfo } from "./plan-tab";
import DangerTab from "./danger-tab";
import AccountTab, { type MyAccount } from "./account-tab";
import { CreditCard, Palette, Store, TriangleAlert, UserRound, Users } from "lucide-react";
import { SectionNav } from "@/components/molecules/section-nav";
import { PageHeader } from "@/components/molecules/page-header";
import type { VerticalValue } from "@/lib/core/sectors/verticals";
import type { BusinessModel } from "@/lib/core/tenancy/business-context";
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
  team: { members: BusinessMember[]; invites: PendingInvite[]; seats: Seats; canManage: boolean; meRole: string; gym?: boolean };
  systemInfo: SystemInfoItem[];
  plan: PlanInfo;
  context: { vertical: VerticalValue; businessModels: BusinessModel[]; activity: string };
  me: MyAccount;
}) {
  const params = useParams();
  const currentSlug = Array.isArray(params?.tenant)
    ? params.tenant[0]
    : (params?.tenant ?? initialTenantSlug);

  // `?seccion=team` (desde Inicio, el círculo del equipo) abre directo esa sección.
  const seccion = useSearchParams()?.get("seccion");
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === seccion) ? (seccion as Tab) : "profile");

  return (
    // `data-bleed`: ocupa todo el ancho de la pantalla (sin el tope de lectura de las páginas de contenido), con su propio margen.
    <div data-bleed="" className="w-full px-4 pb-16 pt-5 sm:px-6 lg:px-10">
        <PageHeader
          eyebrow="Sistema"
          title="Configuración"
          description="Los datos de tu negocio, las personas que lo usan y tus preferencias."
        />

        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <SectionNav ariaLabel="Secciones de configuración" items={TABS} value={tab} onChange={setTab} />
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
