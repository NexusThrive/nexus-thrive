/**
 * Correo de la sesión para decisiones de acceso (SEC-01 y SEC-10 de
 * docs/nexus-architecture/security-audit.md).
 *
 * Vincular una cuenta con una ficha del equipo NEXUS o con una invitación a
 * un negocio se decide por correo, así que el correo tiene que ser:
 * - el principal de la cuenta y **verificado** por Clerk (nunca el primero de
 *   la lista ni uno sin verificar);
 * - comparado de forma **exacta**: en ILIKE, `_`, `%` y `\` son comodines.
 */

type ClerkEmail = {
  id?: string;
  emailAddress: string;
  verification?: { status?: string | null } | null;
};

export type ClerkUserEmails = {
  primaryEmailAddressId?: string | null;
  primaryEmailAddress?: ClerkEmail | null;
  emailAddresses?: ClerkEmail[] | null;
};

/** Normaliza un correo para guardarlo y compararlo. */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Correo principal verificado de la cuenta, normalizado, o `null` si la cuenta
 * no tiene uno. Es el único correo que puede conceder acceso.
 */
export function verifiedEmailOf(user: ClerkUserEmails | null | undefined): string | null {
  if (!user) return null;
  const primary =
    user.primaryEmailAddress ??
    user.emailAddresses?.find((e) => e.id != null && e.id === user.primaryEmailAddressId) ??
    null;
  if (!primary || primary.verification?.status !== "verified") return null;
  const email = normalizeEmail(primary.emailAddress);
  return email || null;
}

/**
 * Patrón de ILIKE que solo coincide con `value` exacto (sin distinguir
 * mayúsculas): escapa la barra invertida y los comodines `%` y `_`.
 */
export function exactIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
