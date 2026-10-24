"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import type { ModuleValue } from "@/lib/admin/catalogs";
import ProfileTab from "./profile-tab";
import TeamTab, { type Seats } from "./team-tab";
import type { PendingInvite, TeamMember as BusinessMember } from "@/lib/business/team-db";
import PlanTab, { type PlanInfo } from "./plan-tab";
import NfcTab, { type CardOwner } from "./nfc-tab";
import DangerTab from "./danger-tab";
import { CreditCard, Plug, Nfc, Palette, Store, TriangleAlert, Users } from "lucide-react";
import { SectionNav } from "@/components/molecules/section-nav";
import { PageHeader } from "@/components/molecules/page-header";
import { ApiKeysPanel } from "@/components/organisms/api-keys-panel";
import type { ApiKeyRow } from "@/lib/api/keys";
import type { VerticalValue } from "@/lib/admin/catalogs";
import type { BusinessModel } from "@/lib/tenant/business-context";
import { createApiKeyAction, revokeApiKeyAction } from "../api-keys-actions";
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
export type { CardOwner, PlanInfo };

type Tab = "profile" | "plan" | "team" | "integrations" | "card" | "appearance" | "danger";

const TABS = [
  { id: "profile", label: "Perfil del negocio", icon: Store, hint: "Nombre, enlace y contacto" },
  { id: "plan", label: "Plan", icon: CreditCard, hint: "Thrive y lo que incluye" },
  { id: "team", label: "Equipo", icon: Users, hint: "Quién entra al negocio" },
  { id: "integrations", label: "Integraciones", icon: Plug, hint: "Llaves de API para n8n y agentes" },
  { id: "card", label: "Tarjeta NFC", icon: Nfc, hint: "Tu tarjeta de contacto" },
  { id: "appearance", label: "Apariencia", icon: Palette, hint: "Tema, densidad y movimiento" },
  { id: "danger", label: "Zona de peligro", icon: TriangleAlert, hint: "Eliminar el negocio" },
] as const satisfies readonly { id: Tab; label: string; icon: unknown; hint: string }[];

/**
 * Shell cliente del módulo de Ajustes: pestañas + provider de notificaciones.
 * Los datos llegan ya resueltos desde el Server Component de la página.
 */
export default function SettingsShell({
  tenantSlug: initialTenantSlug,
  canManage,
  profile,
  team,
  apiKeys,
  systemInfo,
  plan,
  card,
  context,
}: {
  tenantSlug: string;
  canManage: boolean;
  profile: ProfileInitialValues;
  team: { members: BusinessMember[]; invites: PendingInvite[]; seats: Seats; canManage: boolean; meRole: string };
  apiKeys: ApiKeyRow[];
  systemInfo: SystemInfoItem[];
  plan: PlanInfo;
  card: CardOwner;
  context: { vertical: VerticalValue; businessModels: BusinessModel[]; activity: string };
}) {
  const params = useParams();
  const currentSlug = Array.isArray(params?.tenant)
    ? params.tenant[0]
    : (params?.tenant ?? initialTenantSlug);

  const router = useRouter();
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
            context={context}
          />
        )}
        {tab === "plan" && <PlanTab info={plan} />}
        {tab === "team" && <TeamTab slug={initialTenantSlug} {...team} />}
        {tab === "integrations" && (
          <ApiKeysPanel
            keys={apiKeys}
            canManage={team.canManage}
            onCreate={(input) => createApiKeyAction(currentSlug, input)}
            onRevoke={(id) => revokeApiKeyAction(currentSlug, id)}
            onChanged={() => router.refresh()}
          />
        )}
        {tab === "card" && <NfcTab owner={card} />}
        {tab === "appearance" && <AppearanceSettings />}
        {tab === "danger" && <DangerTab slug={initialTenantSlug} canManage={canManage} />}
        </div>
        </div>
    </div>
  );
}
