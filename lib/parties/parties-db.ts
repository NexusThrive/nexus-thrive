import { db } from "@/prisma/db";
import { type DocumentType } from "./documents";

/**
 * Tercero único: una persona o empresa existe UNA vez por negocio y cumple
 * varios roles (cliente, proveedor…). El documento es único por negocio, así
 * que un NIT o cédula repetido es imposible; los duplicados «blandos» (mismo
 * correo, teléfono o nombre) se detectan pero no se bloquean.
 */
export const ROLES = ["CUSTOMER", "SUPPLIER", "EMPLOYEE", "CONTACT"] as const;
export type PartyRoleName = (typeof ROLES)[number];
export { DOCUMENT_TYPES } from "./documents";

/** Solo letras y números en mayúscula; sin puntos, guiones ni espacios. Vacío = sin documento. */
export function normalizeDocument(raw: string | null | undefined): string | null {
  const value = (raw ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return value || null;
}

const normPhone = (raw: string | null | undefined) => (raw ?? "").replace(/\D/g, "").slice(-10) || null;
const normEmail = (raw: string | null | undefined) => (raw ?? "").trim().toLowerCase() || null;
const normName = (raw: string) => raw.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export type PartyInput = {
  kind?: "PERSON" | "COMPANY";
  documentType?: DocumentType | null;
  documentNumber?: string | null;
  checkDigit?: string | null;
  legalName: string;
  tradeName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  roles?: readonly PartyRoleName[];
};

export type PartyRow = {
  id: string;
  kind: string;
  documentType: string | null;
  documentNumber: string | null;
  legalName: string;
  tradeName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  active: boolean;
  roles: string[];
};

export type DuplicateMatch = { partyId: string; legalName: string; reason: "document" | "email" | "phone" | "name" };

const isUniqueViolation = (error: unknown) => /unique|duplicate key|Party_tenantId_documentNumber/i.test(String((error as Error)?.message ?? error));

async function rolesOf(tenantId: string, partyIds: string[]) {
  if (!partyIds.length) return new Map<string, string[]>();
  const rows = await db.orm.public.PartyRole.where({ tenantId }).where((r) => r.partyId.in(partyIds)).all();
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.partyId, [...(map.get(r.partyId) ?? []), r.role]);
  return map;
}

const toRow = (p: Record<string, unknown>, roles: string[]): PartyRow => ({
  id: String(p.id),
  kind: String(p.kind),
  documentType: (p.documentType as string | null) ?? null,
  documentNumber: (p.documentNumber as string | null) ?? null,
  legalName: String(p.legalName),
  tradeName: (p.tradeName as string | null) ?? null,
  email: (p.email as string | null) ?? null,
  phone: (p.phone as string | null) ?? null,
  city: (p.city as string | null) ?? null,
  active: p.active === true,
  roles: roles.sort(),
});

export async function addRole(tenantId: string, partyId: string, role: PartyRoleName): Promise<void> {
  try {
    await db.orm.public.PartyRole.create({ tenantId, partyId, role });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error; // ya lo tenía
  }
}

/** Terceros del negocio que podrían ser la misma persona: por documento (exacto) y, sin bloquear, por correo, teléfono o nombre. */
export async function findDuplicates(tenantId: string, probe: { documentNumber?: string | null; email?: string | null; phone?: string | null; legalName?: string | null }, excludeId?: string): Promise<DuplicateMatch[]> {
  const doc = normalizeDocument(probe.documentNumber);
  const email = normEmail(probe.email);
  const phone = normPhone(probe.phone);
  const name = probe.legalName ? normName(probe.legalName) : null;
  const all = await db.orm.public.Party.where({ tenantId, active: true }).limit(5000).all();
  const out = new Map<string, DuplicateMatch>();
  for (const p of all) {
    if (p.id === excludeId) continue;
    const reason: DuplicateMatch["reason"] | null =
      doc && p.documentNumber === doc ? "document" : email && normEmail(p.email) === email ? "email" : phone && normPhone(p.phone) === phone ? "phone" : name && normName(p.legalName) === name ? "name" : null;
    if (reason) out.set(p.id, { partyId: p.id, legalName: p.legalName, reason });
  }
  return [...out.values()];
}

export type CreatePartyResult = { ok: true; party: PartyRow; possibleDuplicates: DuplicateMatch[] } | { ok: false; code: "duplicate_document" | "invalid"; message: string; existingId?: string };

export async function createParty(tenantId: string, input: PartyInput): Promise<CreatePartyResult> {
  const legalName = input.legalName.trim().slice(0, 160);
  if (legalName.length < 2) return { ok: false, code: "invalid", message: "Escribe el nombre o razón social." };
  const documentNumber = normalizeDocument(input.documentNumber);
  const possibleDuplicates = await findDuplicates(tenantId, { documentNumber, email: input.email, phone: input.phone, legalName });
  const sameDoc = possibleDuplicates.find((d) => d.reason === "document");
  if (sameDoc) return { ok: false, code: "duplicate_document", message: `Ya existe «${sameDoc.legalName}» con ese documento.`, existingId: sameDoc.partyId };

  let created;
  try {
    created = await db.orm.public.Party.create({
      tenantId,
      kind: input.kind ?? "PERSON",
      documentType: input.documentType ?? null,
      documentNumber,
      checkDigit: input.checkDigit ?? null,
      legalName,
      tradeName: input.tradeName?.trim().slice(0, 160) || null,
      email: normEmail(input.email),
      phone: input.phone?.trim().slice(0, 40) || null,
      addressLine: input.addressLine?.trim().slice(0, 200) || null,
      city: input.city?.trim().slice(0, 80) || null,
    });
  } catch (error) {
    // Dos altas simultáneas con el mismo documento: la restricción única de la base gana.
    if (!isUniqueViolation(error)) throw error;
    const existing = await db.orm.public.Party.where({ tenantId, documentNumber }).first();
    return { ok: false, code: "duplicate_document", message: "Ya existe un tercero con ese documento.", existingId: existing?.id };
  }
  const roles = [...new Set(input.roles ?? [])];
  for (const role of roles) await addRole(tenantId, created.id, role);
  return { ok: true, party: toRow(created as unknown as Record<string, unknown>, roles), possibleDuplicates };
}

/**
 * Garantiza que el cliente tenga su tercero (y el rol CUSTOMER) y lo mantiene al
 * día con los datos del cliente. Si el documento del cliente ya es de otro
 * tercero, se enlaza a ese (misma persona). Nunca lanza: la ficha del cliente no
 * debe fallar por el tercero.
 */
export async function syncCustomerParty(tenantId: string, customerId: string): Promise<{ partyId: string | null }> {
  try {
    const customer = await db.orm.public.Customer.where({ tenantId, id: customerId }).first();
    if (!customer) return { partyId: null };
    const doc = normalizeDocument(customer.documentId);
    let partyId = customer.partyId ?? null;

    if (!partyId && doc) partyId = (await db.orm.public.Party.where({ tenantId, documentNumber: doc }).first())?.id ?? null;
    if (!partyId) {
      try {
        partyId = (await db.orm.public.Party.create({ tenantId, legalName: customer.name, email: normEmail(customer.email), phone: customer.phone ?? null, city: customer.city ?? null, documentNumber: doc })).id;
      } catch (error) {
        if (!isUniqueViolation(error) || !doc) throw error;
        partyId = (await db.orm.public.Party.where({ tenantId, documentNumber: doc }).first())?.id ?? null; // carrera: otro lo creó
      }
    } else if (customer.partyId) {
      // Ya enlazado: se refleja el cambio de datos. El documento solo si no es de otro tercero.
      const fields: Record<string, unknown> = { legalName: customer.name, email: normEmail(customer.email), phone: customer.phone ?? null, city: customer.city ?? null };
      const owner = doc ? await db.orm.public.Party.where({ tenantId, documentNumber: doc }).first() : null;
      if (!doc || !owner || owner.id === partyId) fields.documentNumber = doc;
      await db.orm.public.Party.where({ tenantId, id: partyId }).update(fields);
    }
    if (!partyId) return { partyId: null };
    if (customer.partyId !== partyId) await db.orm.public.Customer.where({ tenantId, id: customerId }).update({ partyId });
    await addRole(tenantId, partyId, "CUSTOMER");
    return { partyId };
  } catch (error) {
    console.error(`[parties] no se pudo sincronizar el tercero del cliente ${customerId}:`, error);
    return { partyId: null };
  }
}

export async function listParties(tenantId: string, opts: { role?: PartyRoleName; q?: string; limit?: number } = {}): Promise<PartyRow[]> {
  const limit = Math.min(50, Math.max(1, Math.trunc(opts.limit ?? 20)));
  let ids: string[] | null = null;
  if (opts.role) ids = (await db.orm.public.PartyRole.where({ tenantId, role: opts.role }).all()).map((r) => r.partyId);
  const q = opts.q?.trim().toLowerCase() ?? "";
  const doc = normalizeDocument(opts.q);
  const parties = (await db.orm.public.Party.where({ tenantId, active: true }).orderBy((p) => p.legalName.asc()).limit(5000).all())
    .filter((p) => (!ids || ids.includes(p.id)) && (!q || normName(p.legalName).includes(normName(q)) || (doc && p.documentNumber?.includes(doc)) || normEmail(p.email)?.includes(q)))
    .slice(0, limit);
  const roles = await rolesOf(tenantId, parties.map((p) => p.id));
  return parties.map((p) => toRow(p as unknown as Record<string, unknown>, roles.get(p.id) ?? []));
}
