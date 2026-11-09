import { toNumber } from "@/lib/foundation/format";
import { db } from "@/prisma/db";
import type { CustomerGroupInfo, CustomerSearchRow, OwnerInfo } from "./customer-search";

/**
 * Datos de la búsqueda avanzada de Clientes y de sus grupos propios. Todo va por `tenantId`. La lista se arma en memoria
 * sobre un tope de filas (`MAX_ROWS`) para poder contar cada filtro y agrupar sin tocar la base una vez por opción.
 */
export const MAX_ROWS = 5000;
const DAY = 86_400_000;

/** Temporal.Instant / Date / string a milisegundos (JS solo acepta 3 fracciones; Temporal imprime nanos). */
function toMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  const time = Date.parse(String(value).replace(/\.(\d{3})\d*(Z|[+-])/, ".$1$2"));
  return Number.isNaN(time) ? 0 : time;
}

export async function listOwners(tenantId: string): Promise<OwnerInfo[]> {
  const users = await db.orm.public.User.where({ tenantId }).select("id", "name", "email").limit(500).all();
  return users.map((u) => ({ id: u.id, name: u.name?.trim() || u.email }));
}

export async function listCustomerGroups(tenantId: string): Promise<(CustomerGroupInfo & { members: number })[]> {
  const [groups, members] = await Promise.all([
    db.orm.public.CustomerGroup.where({ tenantId }).orderBy((g) => g.name.asc()).limit(200).all(),
    db.orm.public.CustomerGroupMember.where({ tenantId }).select("groupId").limit(MAX_ROWS * 4).all(),
  ]);
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.groupId, (counts.get(m.groupId) ?? 0) + 1);
  return groups.map((g) => ({ id: g.id, name: g.name, icon: g.icon, members: counts.get(g.id) ?? 0 }));
}

export async function loadCustomerSearchRows(
  tenantId: string,
  options: { withNotes?: boolean; now?: number } = {},
): Promise<{ rows: CustomerSearchRow[]; truncated: boolean; owners: OwnerInfo[] }> {
  const now = options.now ?? Date.now();
  const from = Temporal.Instant.fromEpochMilliseconds(now);
  const since = Temporal.Instant.fromEpochMilliseconds(now - 90 * DAY);

  const [customers, owners, parties, members, upcoming, recent, open, notes] = await Promise.all([
    db.orm.public.Customer.where({ tenantId }).orderBy((c) => c.createdAt.desc()).limit(MAX_ROWS + 1).all(),
    listOwners(tenantId),
    db.orm.public.Party.where({ tenantId }).select("id", "kind").limit(MAX_ROWS * 2).all(),
    db.orm.public.CustomerGroupMember.where({ tenantId }).select("groupId", "customerId").limit(MAX_ROWS * 4).all(),
    db.orm.public.Booking.where({ tenantId }).where((b) => b.startDate.gte(from)).where((b) => b.status.neq("CANCELLED"))
      .orderBy((b) => b.startDate.asc()).select("customerId", "startDate").limit(MAX_ROWS).all(),
    db.orm.public.Booking.where({ tenantId }).where((b) => b.startDate.gte(since)).where((b) => b.startDate.lt(from)).where((b) => b.status.neq("CANCELLED"))
      .orderBy((b) => b.startDate.desc()).select("customerId", "startDate").limit(MAX_ROWS).all(),
    db.orm.public.Obligation.where({ tenantId, status: "OPEN" }).select("customerId", "amount", "paidTotal").limit(MAX_ROWS).all(),
    options.withNotes
      ? db.orm.public.CustomerNote.where({ tenantId }).select("customerId", "content").limit(MAX_ROWS * 4).all()
      : Promise.resolve([]),
  ]);

  const truncated = customers.length > MAX_ROWS;
  const ownerName = new Map(owners.map((o) => [o.id, o.name]));
  const kindOf = new Map(parties.map((p) => [p.id, p.kind]));
  const groupsOf = new Map<string, string[]>();
  for (const m of members) groupsOf.set(m.customerId, [...(groupsOf.get(m.customerId) ?? []), m.groupId]);
  const next = new Map<string, number>();
  for (const b of upcoming) if (!next.has(b.customerId)) next.set(b.customerId, toMillis(b.startDate));
  const last = new Map<string, number>();
  for (const b of recent) if (!last.has(b.customerId)) last.set(b.customerId, toMillis(b.startDate));
  const owed = new Map<string, number>();
  for (const o of open) {
    if (!o.customerId) continue;
    owed.set(o.customerId, (owed.get(o.customerId) ?? 0) + Math.max(0, toNumber(o.amount) - toNumber(o.paidTotal)));
  }
  const notesOf = new Map<string, string>();
  for (const n of notes) notesOf.set(n.customerId, `${notesOf.get(n.customerId) ?? ""}\n${n.content}`);

  const rows = customers.slice(0, MAX_ROWS).map<CustomerSearchRow>((c) => ({
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    documentId: c.documentId ?? "",
    notes: notesOf.get(c.id) ?? "",
    city: c.city ?? "",
    source: c.source ?? "",
    ownerId: c.ownerId ?? "",
    ownerName: c.ownerId ? (ownerName.get(c.ownerId) ?? "") : "",
    tags: [...(c.tags ?? [])],
    createdAt: toMillis(c.createdAt),
    active: c.active,
    kind: c.partyId && kindOf.get(c.partyId) === "COMPANY" ? "COMPANY" : "PERSON",
    groupIds: groupsOf.get(c.id) ?? [],
    nextAppointment: next.get(c.id) ?? null,
    lastVisit: last.get(c.id) ?? null,
    owed: Math.round((owed.get(c.id) ?? 0) * 100) / 100,
  }));
  return { rows, truncated, owners };
}

/** A qué grupos propios pertenece cada uno de estos clientes (para la columna «Grupos» de la lista). */
export async function groupIdsOfCustomers(tenantId: string, customerIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (customerIds.length === 0) return out;
  const rows = await db.orm.public.CustomerGroupMember.where({ tenantId }).where((m) => m.customerId.in(customerIds)).select("customerId", "groupId").limit(MAX_ROWS).all();
  for (const row of rows) out.set(row.customerId, [...(out.get(row.customerId) ?? []), row.groupId]);
  return out;
}

// ---------------------------------------------------------------------------
// Grupos propios
// ---------------------------------------------------------------------------

export type GroupResult = { ok: true; id?: string } | { ok: false; message: string };

const cleanName = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, 60);
const cleanIcon = (icon: string) => (/^[a-z0-9-]{1,32}$/.test(icon) ? icon : "users");

export async function createCustomerGroup(tenantId: string, name: string, icon: string): Promise<GroupResult> {
  const clean = cleanName(name);
  if (!clean) return { ok: false, message: "Escribe el nombre del grupo." };
  const taken = await db.orm.public.CustomerGroup.where({ tenantId, name: clean }).first();
  if (taken) return { ok: false, message: "Ya tienes un grupo con ese nombre." };
  const created = await db.orm.public.CustomerGroup.create({ tenantId, name: clean, icon: cleanIcon(icon) });
  return { ok: true, id: created.id };
}

export async function updateCustomerGroup(tenantId: string, id: string, name: string, icon: string): Promise<GroupResult> {
  const clean = cleanName(name);
  if (!clean) return { ok: false, message: "Escribe el nombre del grupo." };
  const same = await db.orm.public.CustomerGroup.where({ tenantId, name: clean }).first();
  if (same && same.id !== id) return { ok: false, message: "Ya tienes un grupo con ese nombre." };
  await db.orm.public.CustomerGroup.where({ id, tenantId }).update({ name: clean, icon: cleanIcon(icon) });
  return { ok: true, id };
}

export async function deleteCustomerGroup(tenantId: string, id: string): Promise<void> {
  await db.orm.public.CustomerGroup.where({ id, tenantId }).delete();
}

/** Agrega clientes al grupo (los que ya estaban se respetan) o los saca. Solo cuenta clientes del mismo negocio. */
export async function setGroupMembers(tenantId: string, groupId: string, customerIds: string[], mode: "add" | "remove"): Promise<GroupResult> {
  const group = await db.orm.public.CustomerGroup.where({ id: groupId, tenantId }).first();
  if (!group) return { ok: false, message: "Ese grupo ya no existe." };
  const ids = [...new Set(customerIds)].slice(0, 500);
  if (ids.length === 0) return { ok: false, message: "Selecciona al menos un cliente." };
  const valid = await db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(ids)).select("id").all();
  const validIds = valid.map((c) => c.id);
  const current = await db.orm.public.CustomerGroupMember.where({ tenantId, groupId }).where((m) => m.customerId.in(validIds)).select("customerId").all();
  const present = new Set(current.map((m) => m.customerId));
  if (mode === "add") {
    const toAdd = validIds.filter((id) => !present.has(id));
    if (toAdd.length) {
      await db.orm.public.CustomerGroupMember.createAll(toAdd.map((customerId) => ({ tenantId, groupId, customerId }))).toArray();
    }
  } else {
    for (const customerId of validIds.filter((id) => present.has(id))) {
      await db.orm.public.CustomerGroupMember.where({ tenantId, groupId, customerId }).delete();
    }
  }
  return { ok: true };
}
