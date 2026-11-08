import { db } from "@/prisma/db";

/**
 * Favoritos de las listas: búsquedas guardadas por usuario y por sección. Cada consulta lleva `tenantId` y `userId`:
 * nadie ve ni toca las de otra persona. El estado se guarda tal como va en la URL (`q`, `filtros`, `grupo`, `en`, `regla`).
 */
export type SavedSearchParams = import("@/lib/foundation/list-search").SearchSnapshot;
export type SavedSearchItem = { id: string; name: string; isDefault: boolean; params: SavedSearchParams };
export type SavedSearchResult = { ok: true; id?: string } | { ok: false; message: string };

const MAX_PER_SECTION = 30;
const cleanName = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, 60);

/** Solo texto y listas cortas de texto: lo demás se descarta antes de guardar. */
export function sanitizeParams(raw: unknown): SavedSearchParams {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (value: unknown, max = 500) => (typeof value === "string" ? value.slice(0, max) : undefined);
  const out: SavedSearchParams = {};
  const q = text(input.q, 200);
  if (q) out.q = q;
  const en = text(input.en);
  if (en !== undefined) out.en = en;
  const filtros = text(input.filtros);
  if (filtros) out.filtros = filtros;
  const grupo = text(input.grupo);
  if (grupo) out.grupo = grupo;
  if (Array.isArray(input.regla)) out.regla = input.regla.filter((r): r is string => typeof r === "string").map((r) => r.slice(0, 300)).slice(0, 12);
  return out;
}

export async function listSavedSearches(tenantId: string, userId: string, section: string): Promise<SavedSearchItem[]> {
  const rows = await db.orm.public.SavedSearch.where({ tenantId, userId, section }).orderBy((s) => s.createdAt.asc()).limit(MAX_PER_SECTION).all();
  return rows.map((r) => ({ id: r.id, name: r.name, isDefault: r.isDefault, params: sanitizeParams(r.params) }));
}

async function clearDefault(tenantId: string, userId: string, section: string) {
  const current = await db.orm.public.SavedSearch.where({ tenantId, userId, section, isDefault: true }).select("id").all();
  for (const row of current) await db.orm.public.SavedSearch.where({ id: row.id, tenantId, userId }).update({ isDefault: false });
}

export async function createSavedSearch(
  tenantId: string,
  userId: string,
  section: string,
  input: { name: string; params: unknown; isDefault: boolean },
): Promise<SavedSearchResult> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, message: "Ponle un nombre a la búsqueda." };
  const existing = await db.orm.public.SavedSearch.where({ tenantId, userId, section }).select("id").limit(MAX_PER_SECTION + 1).all();
  if (existing.length >= MAX_PER_SECTION) return { ok: false, message: `Puedes guardar hasta ${MAX_PER_SECTION} búsquedas. Elimina alguna para guardar otra.` };
  if (input.isDefault) await clearDefault(tenantId, userId, section);
  const created = await db.orm.public.SavedSearch.create({ tenantId, userId, section, name, params: sanitizeParams(input.params), isDefault: input.isDefault });
  return { ok: true, id: created.id };
}

export async function renameSavedSearch(tenantId: string, userId: string, id: string, name: string): Promise<SavedSearchResult> {
  const clean = cleanName(name);
  if (!clean) return { ok: false, message: "Ponle un nombre a la búsqueda." };
  await db.orm.public.SavedSearch.where({ id, tenantId, userId }).update({ name: clean });
  return { ok: true, id };
}

export async function deleteSavedSearch(tenantId: string, userId: string, id: string): Promise<void> {
  await db.orm.public.SavedSearch.where({ id, tenantId, userId }).delete();
}

/** Marca (o desmarca) una como la que se aplica al entrar; solo una por sección y usuario. */
export async function setDefaultSavedSearch(tenantId: string, userId: string, id: string, value: boolean): Promise<SavedSearchResult> {
  const row = await db.orm.public.SavedSearch.where({ id, tenantId, userId }).first();
  if (!row) return { ok: false, message: "Esa búsqueda ya no existe." };
  if (value) await clearDefault(tenantId, userId, row.section);
  await db.orm.public.SavedSearch.where({ id, tenantId, userId }).update({ isDefault: value });
  return { ok: true, id };
}
