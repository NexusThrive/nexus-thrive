"use server";

import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { can } from "@/lib/core/auth/permissions";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { countOptions, parseSearchState, type SearchState } from "@/lib/foundation/list-search";
import { customerSearchDefs } from "@/lib/business/customers/customer-search";
import {
  createCustomerGroup,
  deleteCustomerGroup,
  listCustomerGroups,
  loadCustomerSearchRows,
  setGroupMembers,
  updateCustomerGroup,
  type GroupResult,
} from "@/lib/business/customers/customer-search-db";

/** Acciones de la búsqueda avanzada de Clientes y de sus grupos propios. Cada una vuelve a comprobar sesión y negocio. */
const denied: GroupResult = { ok: false, message: "No tienes acceso a este negocio." };
const refresh = (slug: string) => revalidatePath(`/${slug}/contactos`);

/** Cuántos clientes quedarían al activar cada filtro, con la búsqueda tal como está. Se pide al abrir el panel. */
export async function customerFilterCountsAction(tenantSlug: string, state: SearchState): Promise<Record<string, number>> {
  const ctx = await requireTenantContext(tenantSlug, "/contactos");
  if (!ctx) return {};
  const [{ rows }, groups] = await Promise.all([
    loadCustomerSearchRows(ctx.tenantId, { withNotes: state.fields?.includes("notas") ?? false }),
    listCustomerGroups(ctx.tenantId),
  ]);
  const defs = customerSearchDefs({ groups, owners: [], rows });
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.fields) params.set("en", state.fields.join(","));
  if (state.filters.length) params.set("filtros", state.filters.join(","));
  for (const rule of state.rules) params.append("regla", `${rule.field}:${rule.op}:${rule.value}`);
  return countOptions(rows, defs, parseSearchState(params, defs));
}

export async function createGroupAction(tenantSlug: string, name: string, icon: string, customerIds: string[] = []): Promise<GroupResult> {
  const ctx = await requireTenantContext(tenantSlug, "/contactos");
  if (!ctx) return denied;
  const created = await createCustomerGroup(ctx.tenantId, name, icon);
  if (!created.ok) return created;
  if (customerIds.length && created.id) {
    const added = await setGroupMembers(ctx.tenantId, created.id, customerIds, "add");
    if (!added.ok) return added;
  }
  refresh(tenantSlug);
  return created;
}

export async function updateGroupAction(tenantSlug: string, id: string, name: string, icon: string): Promise<GroupResult> {
  const ctx = await requireTenantContext(tenantSlug, "/contactos");
  if (!ctx) return denied;
  const result = await updateCustomerGroup(ctx.tenantId, id, name, icon);
  if (result.ok) refresh(tenantSlug);
  return result;
}

export async function deleteGroupAction(tenantSlug: string, id: string): Promise<GroupResult> {
  const ctx = await requireTenantContext(tenantSlug, "/contactos");
  if (!ctx) return denied;
  if (!can(ctx.role, "customers.delete")) return { ok: false, message: "Tu rol no puede eliminar grupos. Pídeselo a administración." };
  await deleteCustomerGroup(ctx.tenantId, id);
  await logTenantAction(ctx, "BIZ_CUSTOMER_GROUP_DELETE", { groupId: id });
  refresh(tenantSlug);
  return { ok: true };
}

export async function assignGroupAction(tenantSlug: string, groupId: string, customerIds: string[], mode: "add" | "remove"): Promise<GroupResult> {
  const ctx = await requireTenantContext(tenantSlug, "/contactos");
  if (!ctx) return denied;
  const result = await setGroupMembers(ctx.tenantId, groupId, customerIds, mode);
  if (result.ok) refresh(tenantSlug);
  return result;
}
