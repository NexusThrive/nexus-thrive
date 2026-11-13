import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { loadActiveTenant } from "@/lib/core/tenancy/context";
import { expireBenefitTrial } from "@/lib/platform/benefits/benefits-db";
import { verifiedEmailOf } from "@/lib/core/auth/session-email";
import { resolveTenantMembership } from "@/lib/core/tenancy/membership";
import { TenantAccessDenied } from "@/components/molecules/tenant-access-denied";

/**
 * Shell multi-tenant: acceso.
 *
 * Server Component que resuelve sesión (Clerk), tenant (existente y
 * activo) y membresía del usuario. Es el ÚNICO responsable de autorización:
 * - Sin sesión → sign-in.
 * - Tenant inexistente/inactivo → 404.
 * - No miembro → "Sin acceso" sin renderizar hijos. Se entra solo con una
 *   membresía activa o aceptando una invitación al correo verificado. Un
 *   negocio sin miembros NO se le entrega al primero que llega (SEC-02): su
 *   dueño entra con la invitación OWNER que deja el panel al crearlo.
 *
 * Los hijos (dashboard, módulos u onboarding) solo se renderizan cuando la
 * membresía está confirmada. El layout de la ruta `(app)` decide después si
 * redirigir a onboarding según `onboardingCompleted`.
 */
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    redirectToSignIn();
    return null;
  }

  // 1) El tenant debe existir y estar activo.
  const tenantRecord = await loadActiveTenant(tenantSlug);

  if (!tenantRecord) {
    notFound();
  }

  // Vencimiento del mes gratis (beneficio de tarjeta): si su período ya pasó,
  // el negocio revierte a Essential (gratis). Idempotente y silencioso.
  await expireBenefitTrial(tenantRecord.id);

  // 2) Membresía activa, o la invitación pendiente a su correo verificado.
  const localUser = await resolveTenantMembership({
    tenantId: tenantRecord.id,
    clerkUserId: userId,
    identity: async () => {
      const me = await currentUser();
      return { verifiedEmail: verifiedEmailOf(me), name: me?.fullName ?? null };
    },
  });

  if (!localUser) {
    // Se muestra con qué cuenta entró, para que se note si es la equivocada.
    const me = await currentUser();
    return <TenantAccessDenied tenantName={tenantRecord.name} email={verifiedEmailOf(me) ?? me?.primaryEmailAddress?.emailAddress ?? null} name={me?.fullName ?? null} />;
  }

  // El shell visual (Header/Sidebar) vive en `(app)/layout.tsx`: el
  // onboarding se ve a pantalla completa, sin el shell del negocio.
  return <>{children}</>;
}
