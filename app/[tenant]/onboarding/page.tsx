import { redirect } from "next/navigation";
import { requirePageContext } from "@/lib/tenant/context";

/**
 * `/{tenant}/onboarding` era un segundo wizard (el clásico). Hay uno solo, el
 * adaptativo de `/onboarding` (ARCH-03): esta ruta lo retoma para este negocio,
 * igual que el gate de `(app)/layout.tsx`.
 */
export default async function OnboardingPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  const { tenant } = await requirePageContext(tenantSlug);
  redirect(tenant.onboardingCompleted ? `/${tenantSlug}` : `/onboarding?tenant=${tenantSlug}`);
}
