"use server";

import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import {
  createSavedSearch,
  deleteSavedSearch,
  renameSavedSearch,
  setDefaultSavedSearch,
  type SavedSearchResult,
} from "@/lib/core/tenancy/saved-searches-db";

/**
 * Favoritos de las listas (búsquedas guardadas). Son de quien las guarda: cada operación se acota por negocio y por la
 * persona de la sesión, no por un id que mande el cliente. `section` es la lista (`customers`, `crm`…).
 */
const SECTIONS: Record<string, string> = { customers: "/contactos", crm: "/crm" };

async function context(tenantSlug: string, section: string) {
  const route = SECTIONS[section];
  if (!route) return null;
  const ctx = await requireTenantContext(tenantSlug, route);
  return ctx ? { ctx, route } : null;
}

const denied: SavedSearchResult = { ok: false, message: "No tienes acceso a este negocio." };

export async function saveSearchAction(
  tenantSlug: string,
  section: string,
  input: { name: string; params: unknown; isDefault: boolean },
): Promise<SavedSearchResult> {
  const c = await context(tenantSlug, section);
  if (!c) return denied;
  const result = await createSavedSearch(c.ctx.tenantId, c.ctx.memberId, section, input);
  if (result.ok) revalidatePath(`/${tenantSlug}${c.route}`);
  return result;
}

export async function renameSearchAction(tenantSlug: string, section: string, id: string, name: string): Promise<SavedSearchResult> {
  const c = await context(tenantSlug, section);
  if (!c) return denied;
  const result = await renameSavedSearch(c.ctx.tenantId, c.ctx.memberId, id, name);
  if (result.ok) revalidatePath(`/${tenantSlug}${c.route}`);
  return result;
}

export async function deleteSearchAction(tenantSlug: string, section: string, id: string): Promise<SavedSearchResult> {
  const c = await context(tenantSlug, section);
  if (!c) return denied;
  await deleteSavedSearch(c.ctx.tenantId, c.ctx.memberId, id);
  revalidatePath(`/${tenantSlug}${c.route}`);
  return { ok: true };
}

export async function setDefaultSearchAction(tenantSlug: string, section: string, id: string, value: boolean): Promise<SavedSearchResult> {
  const c = await context(tenantSlug, section);
  if (!c) return denied;
  const result = await setDefaultSavedSearch(c.ctx.tenantId, c.ctx.memberId, id, value);
  if (result.ok) revalidatePath(`/${tenantSlug}${c.route}`);
  return result;
}
