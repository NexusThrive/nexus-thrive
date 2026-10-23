/**
 * Resolución del contexto de onboarding en el servidor.
 *
 * Determina si el usuario debe CREAR su primer espacio (`create`), REANUDAR
 * un tenant pendiente al que ya pertenece (`resume`) o si ya tiene espacios
 * completos (`done` → la página redirige). Módulo de servidor (usa `db`):
 * NO importable desde componentes cliente.
 */

import { db } from "@/prisma/db";
import { isModule, sortModules } from "@/lib/admin/catalogs";
import {
  EMPTY_DRAFT,
  type OnboardingDraft,
  type OnboardingPrefill,
} from "@/lib/onboarding/types";

/**
 * El `include("tenant", ...)` del ORM devuelve la fila relacionada con los
 * campos seleccionados. Tomamos solo los que el borrador necesita (los
 * enums del contract son estructuralmente compatibles con los unions).
 */
type TenantForDraft = {
  name: string;
  slug: string;
  vertical: OnboardingDraft["vertical"];
  tenantType: OnboardingDraft["tenantType"];
  legalName: string | null;
  taxId: string | null;
  teamSize: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  city: string | null;
  onboardingCompleted: boolean;
  modules: { moduleName: string; active: boolean }[];
  plan?: OnboardingDraft["plan"];
  billingCycle?: OnboardingDraft["billing"];
  customerTierId?: string | null;
};

function tenantToDraft(tenant: TenantForDraft): OnboardingDraft {
  return {
    tenantType: tenant.tenantType,
    name: tenant.name,
    legalName: tenant.legalName ?? "",
    taxId: tenant.taxId ?? "",
    slugRaw: tenant.slug,
    vertical: tenant.vertical,
    teamSize: (tenant.teamSize as OnboardingDraft["teamSize"]) ?? null,
    address: tenant.address ?? "",
    latitude: tenant.latitude ?? null,
    longitude: tenant.longitude ?? null,
    placeId: tenant.placeId ?? null,
    city: tenant.city ?? "",
    selectedModules: sortModules(
      tenant.modules
        .filter((module) => module.active)
        .map((module) => module.moduleName)
        .filter(isModule),
    ),
    plan: tenant.plan ?? "ESSENTIAL",
    billing: tenant.billingCycle ?? "MONTHLY",
    customerTierId: tenant.customerTierId ?? null,
  };
}

export async function getOnboardingPrefill(
  clerkUserId: string,
  preferredSlug?: string,
): Promise<OnboardingPrefill> {
  const memberships = await db.orm.public.User.where({
    clerkUserId,
  })
    .include("tenant", (tenant) =>
      tenant
        .select(
          "id",
          "name",
          "slug",
          "vertical",
          "tenantType",
          "legalName",
          "taxId",
          "teamSize",
          "address",
          "latitude",
          "longitude",
          "placeId",
          "city",
          "onboardingCompleted",
        )
        .include("modules", (module) =>
          module.select("moduleName", "active"),
        ),
    )
    .all();

  // El gate de `(app)` reanuda el tenant pendiente del subdominio con
  // `?tenant=<slug>`; si el preferido no existe o ya completó, caemos al
  // comportamiento genérico (primer pendiente, o done, o create).
  const target = preferredSlug
    ? memberships.find(
        (membership) => membership.tenant?.slug === preferredSlug,
      )
    : undefined;

  const pending = target
    ? target
    : memberships.find((membership) => {
        const tenant = membership.tenant;
        return tenant !== null && !tenant.onboardingCompleted;
      });

  if (pending && pending.tenant && !pending.tenant.onboardingCompleted) {
    return {
      mode: "resume",
      tenantId: pending.tenantId,
      tenantName: pending.tenant.name,
      draft: tenantToDraft(pending.tenant),
    };
  }

  const completed = target?.tenant ?? memberships[0]?.tenant;
  if (completed) {
    return {
      mode: "done",
      doneSlug: completed.slug,
      draft: EMPTY_DRAFT,
    };
  }

  return { mode: "create", draft: EMPTY_DRAFT };
}