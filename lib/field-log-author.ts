/**
 * Construcción del autor de una anotación de bitácora (Etapa 1.6).
 *
 * El autor SIEMPRE se deriva del contexto de sesión (usuario autenticado),
 * nunca del payload del formulario (anti-suplantación).
 */

import type { TenantContext } from "@/lib/tenant-context";

/** Datos del autor derivados del contexto. */
export type FieldLogAuthor = {
  authorName: string;
  authorRole: "SUPERADMIN" | "OWNER" | "STAFF";
};

/**
 * Construye el autor a partir del contexto de tenant.
 * Ignora cualquier `authorName`/`authorRole` que venga en el payload.
 *
 * @param context Contexto resuelto por `requireTenantContext`.
 * @returns Objeto con `authorName` y `authorRole` derivados de la sesión.
 */
export function buildAuthorFromContext(context: TenantContext): FieldLogAuthor {
  // El nombre se deriva del miembro en la BD, no del formulario.
  // `context` ya tiene `userId`, `role`, etc., pero no el nombre.
  // Esta función asume que el caller ya resolvió el miembro.
  // Para mantenerla pura, recibimos el nombre ya resuelto.
  throw new Error("Use buildAuthorFromMember para construir el autor.");
}

/**
 * Construye el autor a partir del miembro resuelto en la BD.
 * Ignora cualquier `authorName`/`authorRole` que venga en el payload.
 *
 * @param member Registro del usuario en la tabla User (tenant).
 * @param role Rol D7 del usuario (ya resuelto en el contexto).
 * @returns Objeto con `authorName` y `authorRole`.
 */
export function buildAuthorFromMember(
  member: { name?: string | null; email: string } | null,
  role: "SUPERADMIN" | "OWNER" | "STAFF",
): FieldLogAuthor {
  return {
    authorName: member?.name?.trim() || member?.email || "Usuario",
    authorRole: role,
  };
}

/**
 * Validador que asegura que el payload no intente sobrescribir el autor.
 * Lanza si el payload contiene `authorName` o `authorRole`.
 */
export function assertNoAuthorOverride(payload: Record<string, unknown>): void {
  if ("authorName" in payload || "authorRole" in payload) {
    throw new Error("El autor se deriva de la sesión; no se puede sobrescribir.");
  }
}