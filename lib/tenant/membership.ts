import { db } from "@/prisma/db";
import { acceptInvitesFor } from "@/lib/business/team-db";

/**
 * Membresía activa de una cuenta en un negocio, o `null` si no puede entrar.
 *
 * Se entra con una membresía activa o aceptando una invitación pendiente al
 * correo **verificado** de la sesión. Nunca se crea un dueño por llegar
 * primero a un negocio sin miembros (SEC-02 en
 * docs/nexus-architecture/security-audit.md): el dueño de un negocio creado
 * desde el panel entra con la invitación OWNER que deja `createTenant`.
 */
export async function resolveTenantMembership(input: {
  tenantId: string;
  clerkUserId: string;
  /**
   * Correo principal verificado (`verifiedEmailOf`) y nombre de la sesión. Se
   * pide solo si hace falta aceptar una invitación (es una llamada a Clerk).
   */
  identity: () => Promise<{ verifiedEmail: string | null; name: string | null }>;
}) {
  const { tenantId, clerkUserId } = input;
  const find = () => db.orm.public.User.where({ tenantId, clerkUserId }).first();

  let user = await find();
  if (!user || !user.active) {
    const { verifiedEmail, name } = await input.identity();
    if (verifiedEmail) {
      const accepted = await acceptInvitesFor(clerkUserId, verifiedEmail, name, tenantId);
      if (accepted.length) user = await find();
    }
  }
  return user && user.active ? user : null;
}

/**
 * ¿La cuenta es miembro **activo** del negocio? Para servir archivos y fotos:
 * quien fue retirado del equipo deja de verlos (SEC-08).
 */
export async function isActiveMember(tenantId: string, clerkUserId: string): Promise<boolean> {
  const member = await db.orm.public.User.where({ tenantId, clerkUserId, active: true }).select("id").first();
  return member !== null;
}
