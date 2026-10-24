import { db } from "@/prisma/db";
import { MAX_LIMIT, limitProblem, normalizeEmail, parseLimit } from "./account-limits";

/**
 * Personas de la plataforma (Operations Center): quién es dueña o integrante de cuántos negocios y cuál es su límite.
 * Es lectura de toda la plataforma (solo para el equipo NEXUS con permiso), por eso no filtra por `tenantId`.
 */
export type UserOrg = { tenantId: string; name: string; slug: string; role: string; active: boolean; tenantActive: boolean };
export type PlatformUser = { email: string; name: string | null; orgs: UserOrg[]; owned: number; limit: number | null; note: string | null };

const PEOPLE_CAP = 5000;

export async function listPlatformUsers(opts: { q?: string } = {}): Promise<{ users: PlatformUser[]; total: number }> {
  const [members, limits, invites] = await Promise.all([
    db.orm.public.User.limit(PEOPLE_CAP).all(),
    db.orm.public.AccountLimit.all(),
    db.orm.public.TenantInvite.where({ role: "OWNER" }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).all(),
  ]);
  const tenants = await db.orm.public.Tenant.select("id", "name", "slug", "active").all();
  const byTenant = new Map(tenants.map((t) => [t.id, t]));
  const limitOf = new Map(limits.map((l) => [l.email, l]));
  const people = new Map<string, PlatformUser>();
  const person = (email: string, name: string | null) => {
    const key = normalizeEmail(email);
    if (!people.has(key)) people.set(key, { email: key, name, orgs: [], owned: 0, limit: limitOf.get(key)?.maxOrganizations ?? null, note: limitOf.get(key)?.note ?? null });
    const p = people.get(key)!;
    if (!p.name && name) p.name = name;
    return p;
  };
  for (const m of members) {
    const t = byTenant.get(m.tenantId);
    if (!t) continue;
    const p = person(m.email, m.name);
    p.orgs.push({ tenantId: t.id, name: t.name, slug: t.slug, role: String(m.role), active: m.active, tenantActive: t.active });
    if (String(m.role) === "OWNER" && m.active && !m.removedAt) p.owned++;
  }
  // Invitaciones de dueño abiertas: ya cuentan, aunque la persona aún no haya entrado.
  const now = Date.now();
  for (const i of invites) {
    const t = byTenant.get(i.tenantId);
    if (!t || Date.parse(String(i.expiresAt)) < now) continue;
    const p = person(i.email, i.name);
    if (!p.orgs.some((o) => o.tenantId === t.id)) {
      p.orgs.push({ tenantId: t.id, name: t.name, slug: t.slug, role: "OWNER (invitación)", active: true, tenantActive: t.active });
      p.owned++;
    }
  }
  for (const l of limits) person(l.email, null); // con límite fijado pero sin negocios todavía
  const q = (opts.q ?? "").trim().toLowerCase();
  const all = [...people.values()]
    .filter((u) => !q || u.email.includes(q) || (u.name ?? "").toLowerCase().includes(q) || u.orgs.some((o) => o.name.toLowerCase().includes(q)))
    .sort((a, b) => b.owned - a.owned || a.email.localeCompare(b.email));
  return { users: all.slice(0, 200), total: all.length };
}

/** Negocios que la persona ya tiene como dueña (más invitaciones de dueño abiertas). */
export async function ownedCountOf(email: string): Promise<number> {
  const key = normalizeEmail(email);
  const [owners, invites] = await Promise.all([
    db.orm.public.User.where({ email: key, role: "OWNER", active: true }).all(),
    db.orm.public.TenantInvite.where({ email: key, role: "OWNER" }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).all(),
  ]);
  const now = Date.now();
  const ids = new Set(owners.filter((o) => !o.removedAt).map((o) => o.tenantId));
  for (const i of invites) if (Date.parse(String(i.expiresAt)) >= now) ids.add(i.tenantId);
  return ids.size;
}

export async function limitOf(email: string): Promise<number | null> {
  const row = await db.orm.public.AccountLimit.where({ email: normalizeEmail(email) }).first();
  return row?.maxOrganizations ?? null;
}

/** Texto del problema si la persona ya no puede tener otro negocio; null si puede. */
export async function organizationLimitProblem(email: string): Promise<string | null> {
  const limit = await limitOf(email);
  if (limit === null) return null;
  return limitProblem(await ownedCountOf(email), limit);
}

export async function setLimit(email: string, raw: string, note?: string): Promise<{ ok: true; limit: number | null } | { ok: false; message: string }> {
  const key = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(key)) return { ok: false, message: "Ese correo no parece válido." };
  const parsed = parseLimit(raw);
  if (!parsed.ok) return parsed;
  if (parsed.value === null) {
    await db.orm.public.AccountLimit.where({ email: key }).deleteAll();
    return { ok: true, limit: null };
  }
  await db.orm.public.AccountLimit.upsert({ create: { email: key, maxOrganizations: parsed.value, note: note?.trim().slice(0, 200) || null }, update: { maxOrganizations: parsed.value, note: note?.trim().slice(0, 200) || null }, conflictOn: { email: key } });
  return { ok: true, limit: parsed.value };
}

export { MAX_LIMIT };
