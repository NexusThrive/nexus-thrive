import { MoneyError } from "@/lib/business/money-error";
import { toNumber } from "@/lib/format";
import { todayCO } from "@/lib/tax/tax";
import { db } from "@/prisma/db";
import { PeriodClosedError, assertPeriodOpen } from "./accounting-db";
import { GENESIS, cents, entryHash, linesFromRule, reverseLines, totals, validateEntry, type Amounts, type EntryLine } from "./ledger";
import type { RuleLine } from "./puc";

/**
 * Libro mayor (servidor). Solo se AGREGA: no hay forma de editar ni borrar un asiento; se corrige con otro que
 * lo reversa. Cada asiento lleva el sello del anterior (`verifyLedger` lo comprueba). Los asientos automáticos
 * se escriben en la MISMA transacción que el hecho que los origina, con las reglas activas del plan.
 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Writer = Pick<Tx, "orm">;

export class LedgerError extends MoneyError {}

export type EntryInput = { date: string; description: string; event: string; sourceType: string; sourceId?: string | null; lines: readonly EntryLine[]; reversalOfId?: string | null };

/** Escribe un asiento validado (partida doble, cuentas del plan, mes abierto). Devuelve su número. */
export async function postEntry(tx: Writer, tenantId: string, input: EntryInput, userId: string | null): Promise<{ id: string; number: number }> {
  const problem = validateEntry(input.lines);
  if (problem) throw new LedgerError(problem);
  const codes = [...new Set(input.lines.map((l) => l.account))];
  const accounts = await tx.orm.public.Account.where({ tenantId }).where((a) => a.code.in(codes)).all();
  for (const code of codes) {
    const acc = accounts.find((a) => a.code === code);
    if (!acc || !acc.active || !acc.postable) throw new LedgerError(`La cuenta ${code} no existe, está desactivada o solo agrupa: no recibe asientos.`);
  }
  await assertPeriodOpen(tenantId, input.date, tx);
  const last = await tx.orm.public.JournalEntry.where({ tenantId }).orderBy((e) => e.number.desc()).first();
  const number = (last?.number ?? 0) + 1;
  const hash = entryHash(last?.hash ?? GENESIS, { number, date: input.date, event: input.event, sourceType: input.sourceType, sourceId: input.sourceId ?? null, lines: input.lines });
  const entry = await tx.orm.public.JournalEntry.create({ tenantId, number, date: input.date, description: input.description.slice(0, 200), event: input.event, sourceType: input.sourceType, sourceId: input.sourceId ?? null, reversalOfId: input.reversalOfId ?? null, hash, createdById: userId });
  await tx.orm.public.JournalLine.createAll(input.lines.map((l) => ({ tenantId, entryId: entry.id, accountCode: l.account, debit: l.debit.toFixed(2), credit: l.credit.toFixed(2), label: l.label?.slice(0, 120) ?? null, partyId: l.partyId ?? null, costCenterId: l.costCenterId ?? null }))).toArray();
  return { id: entry.id, number };
}

/**
 * Contabiliza un hecho con su regla (si el negocio contabiliza automáticamente y la regla está activa). Sin
 * contabilidad activa o sin regla, no hace nada (devuelve `null`): nunca estorba una venta. Un asiento que no
 * se puede escribir (mes cerrado, cuenta apagada) SÍ falla y deshace el hecho: el libro nunca queda a medias.
 */
export async function postByRule(
  tx: Writer,
  tenantId: string,
  event: string,
  amounts: Amounts,
  meta: { date: string; description: string; sourceType: string; sourceId: string; partyId?: string | null; costCenterId?: string | null; /** Cuenta que reemplaza a otra (p. ej. 1105 → 1110 si se cobró por banco). */ swap?: Record<string, string> },
  userId: string | null,
): Promise<{ id: string; number: number } | null> {
  const tenant = await tx.orm.public.Tenant.where({ id: tenantId }).select("accountingEnabled").first();
  if (!tenant?.accountingEnabled) return null;
  const rule = await tx.orm.public.AccountingRule.where({ tenantId, event }).first();
  if (!rule?.active) return null;
  const lines = linesFromRule(rule.lines as unknown as RuleLine[], amounts, { partyId: meta.partyId, costCenterId: meta.costCenterId }).map((l) => ({ ...l, account: meta.swap?.[l.account] ?? l.account }));
  if (lines.length < 2) return null;
  return postEntry(tx, tenantId, { date: meta.date, description: meta.description, event, sourceType: meta.sourceType, sourceId: meta.sourceId, lines }, userId);
}

/** Cuenta de caja o de banco según el medio de pago: el efectivo entra a Caja; lo demás, a Bancos. */
export const cashAccountFor = (method: string): Record<string, string> => (method === "CASH" ? {} : { "1105": "1110" });

/**
 * Reversa los asientos de un origen que aún no estén reversados (anular una venta o un cobro). El reverso lleva
 * la fecha de hoy: si ese mes está cerrado, falla con un mensaje claro y la anulación no se hace.
 */
export async function reverseSource(tx: Writer, tenantId: string, sourceType: string, sourceId: string, reason: string, userId: string | null): Promise<number> {
  const entries = await tx.orm.public.JournalEntry.where({ tenantId, sourceType, sourceId }).all();
  const originals = entries.filter((e) => !e.reversalOfId);
  const reversed = new Set(entries.filter((e) => e.reversalOfId).map((e) => e.reversalOfId));
  let n = 0;
  for (const e of originals) {
    if (reversed.has(e.id)) continue;
    const lines = await tx.orm.public.JournalLine.where({ tenantId, entryId: e.id }).all();
    const back: EntryLine[] = reverseLines(lines.map((l) => ({ account: l.accountCode, debit: toNumber(l.debit), credit: toNumber(l.credit), label: l.label ?? undefined, partyId: l.partyId, costCenterId: l.costCenterId })));
    await postEntry(tx, tenantId, { date: todayCO(), description: `Reverso del asiento ${e.number}: ${reason}`.slice(0, 200), event: "REVERSAL", sourceType, sourceId, lines: back, reversalOfId: e.id }, userId);
    n++;
  }
  return n;
}

/** Recorre el libro entero y comprueba la cadena de sellos y que cada asiento cuadre. */
export async function verifyLedger(tenantId: string): Promise<{ ok: true; checked: number } | { ok: false; checked: number; brokenAt: number; reason: string }> {
  const entries = await db.orm.public.JournalEntry.where({ tenantId }).orderBy((e) => e.number.asc()).all();
  let prev = GENESIS;
  let checked = 0;
  for (const e of entries) {
    const lines = (await db.orm.public.JournalLine.where({ tenantId, entryId: e.id }).all()).map((l) => ({ account: l.accountCode, debit: toNumber(l.debit), credit: toNumber(l.credit), partyId: l.partyId, costCenterId: l.costCenterId }));
    const t = totals(lines);
    if (cents(t.debit) !== cents(t.credit)) return { ok: false, checked, brokenAt: e.number, reason: "El asiento no cuadra." };
    if (entryHash(prev, { number: e.number, date: e.date, event: e.event, sourceType: e.sourceType, sourceId: e.sourceId, lines }) !== e.hash) return { ok: false, checked, brokenAt: e.number, reason: "El contenido o el orden del libro fue alterado." };
    prev = e.hash;
    checked++;
  }
  return { ok: true, checked };
}

export async function setAccountingEnabled(tenantId: string, enabled: boolean): Promise<{ ok: true } | { ok: false; message: string }> {
  if (enabled) {
    const rules = await db.orm.public.AccountingRule.where({ tenantId, active: true }).select("id").first();
    if (!rules) return { ok: false, message: "Primero carga el plan de cuentas y activa al menos una regla." };
  }
  await db.orm.public.Tenant.where({ id: tenantId }).update({ accountingEnabled: enabled });
  return { ok: true };
}

export type EntryRow = { id: string; number: number; date: string; description: string; event: string; reversalOfId: string | null; reversed: boolean; lines: { account: string; debit: number; credit: number; label: string | null }[] };

export async function listEntries(tenantId: string, limit = 100): Promise<EntryRow[]> {
  const entries = await db.orm.public.JournalEntry.where({ tenantId }).orderBy((e) => e.number.desc()).limit(limit).all();
  if (!entries.length) return [];
  const lines = await db.orm.public.JournalLine.where({ tenantId }).where((l) => l.entryId.in(entries.map((e) => e.id))).all();
  const reversedIds = new Set((await db.orm.public.JournalEntry.where({ tenantId }).where((e) => e.reversalOfId.isNotNull()).all()).map((e) => e.reversalOfId));
  return entries.map((e) => ({ id: e.id, number: e.number, date: e.date, description: e.description, event: e.event, reversalOfId: e.reversalOfId, reversed: reversedIds.has(e.id), lines: lines.filter((l) => l.entryId === e.id).map((l) => ({ account: l.accountCode, debit: toNumber(l.debit), credit: toNumber(l.credit), label: l.label })) }));
}

export { PeriodClosedError };
