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

/**
 * Negocio de una cuenta (membresía activa): a dónde la manda el callback de
 * inicio de sesión y a qué negocio se aplica un código de beneficio. `null`
 * si todavía no tiene negocio.
 */
export async function homeTenantFor(
  clerkUserId: string,
): Promise<{ tenantId: string; slug: string; name: string; onboardingCompleted: boolean } | null> {
  const user = await db.orm.public.User.where({ clerkUserId, active: true })
    .include("tenant", (t) => t.select("slug", "name", "onboardingCompleted"))
    .first();
  if (!user?.tenant) return null;
  return { tenantId: user.tenantId, slug: user.tenant.slug, name: user.tenant.name, onboardingCompleted: user.tenant.onboardingCompleted };
}

/**
 * Negocios en los que la cuenta es miembro activo (activos y con el alta
 * completa), por nombre. Solo lee las membresías de esa cuenta: es lo que
 * muestra el selector de negocio de la navbar.
 */
export async function businessesOfMember(clerkUserId: string): Promise<{ slug: string; name: string }[]> {
  const rows = await db.orm.public.User.where({ clerkUserId, active: true })
    .include("tenant", (t) => t.select("slug", "name", "active", "onboardingCompleted"))
    .all();
  return rows
    .flatMap((row) => (row.tenant && row.tenant.active && row.tenant.onboardingCompleted ? [{ slug: row.tenant.slug, name: row.tenant.name }] : []))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Registro completo del negocio por id, con sus módulos (Configuración). */
export async function tenantWithModules(tenantId: string) {
  return db.orm.public.Tenant.where({ id: tenantId })
    .include("modules", (module) => module.select("moduleName", "active"))
    .first();
}

/** Datos del negocio que van en sus documentos (cuenta de cobro, recibo). */
export async function tenantLetterhead(tenantId: string) {
  return db.orm.public.Tenant.where({ id: tenantId }).select("name", "legalName", "taxId", "address", "city", "whatsappNumber").first();
}

/** Negocio activo por slug, con sus módulos (shell de la app). */
export async function activeTenantWithModules(slug: string) {
  return db.orm.public.Tenant.where({ slug, active: true })
    .include("modules", (module) => module.select("moduleName", "active"))
    .first();
}

/** Tema guardado de la persona en ese negocio (`null` si no eligió). */
export async function memberTheme(tenantId: string, clerkUserId: string): Promise<"dark" | "light" | null> {
  const me = await db.orm.public.User.where({ tenantId, clerkUserId }).select("theme").first();
  return me?.theme === "dark" || me?.theme === "light" ? me.theme : null;
}

/** Integrantes del negocio (id, nombre y correo) para mostrar quién hizo qué. */
export async function memberDirectory(tenantId: string) {
  return db.orm.public.User.where({ tenantId }).select("id", "name", "email").all();
}

/** Guarda el tema (claro u oscuro) en la membresía de la persona en ese negocio. */
export async function saveMemberTheme(tenantId: string, memberId: string, theme: string) {
  await db.orm.public.User.where({ id: memberId, tenantId }).update({ theme });
}
