import { db } from "@/prisma/db";
import { todayCO } from "@/lib/tax/tax";
import { DEFAULT_RULES, PUC_TEMPLATE, natureOf, periodOfDate, typeOf, validateAccount, validateRule, type AccountType, type RuleLine } from "./puc";

/**
 * Contabilidad I (servidor): plan de cuentas, reglas de asientos, centros de costo y períodos con cierre.
 * Todo con `tenantId`. Un negocio nuevo trae su PUC y sus reglas de partida (`seedAccounting`).
 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Writer = Pick<Tx, "orm">;
const instant = () => Temporal.Instant.fromEpochMilliseconds(Date.now());

/** Siembra PUC y reglas que falten (por código/evento): idempotente, sirve para negocios nuevos y antiguos. */
export async function seedAccounting(tenantId: string, tx: Writer = { orm: db.orm }): Promise<{ accounts: number; rules: number }> {
  const haveAccounts = new Set((await tx.orm.public.Account.where({ tenantId }).select("code").all()).map((a) => a.code));
  const newAccounts = PUC_TEMPLATE.filter((a) => !haveAccounts.has(a.code)).map((a) => ({ tenantId, ...a }));
  if (newAccounts.length) await tx.orm.public.Account.createAll(newAccounts).toArray();
  const haveRules = new Set((await tx.orm.public.AccountingRule.where({ tenantId }).select("event").all()).map((r) => r.event));
  const newRules = DEFAULT_RULES.filter((r) => !haveRules.has(r.event)).map((r) => ({ tenantId, event: r.event, name: r.name, lines: r.lines as never }));
  if (newRules.length) await tx.orm.public.AccountingRule.createAll(newRules).toArray();
  return { accounts: newAccounts.length, rules: newRules.length };
}

export type AccountRow = { id: string; code: string; name: string; type: AccountType; nature: "D" | "C"; postable: boolean; active: boolean };

export async function listAccounts(tenantId: string): Promise<AccountRow[]> {
  const rows = await db.orm.public.Account.where({ tenantId }).all();
  return rows.map((a) => ({ id: a.id, code: a.code, name: a.name, type: a.type as AccountType, nature: a.nature as "D" | "C", postable: a.postable, active: a.active })).sort((x, y) => x.code.localeCompare(y.code));
}

export async function createAccount(tenantId: string, input: { code: string; name: string }): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const code = input.code.trim();
  const problem = validateAccount({ code, name: input.name }, (await listAccounts(tenantId)).map((a) => a.code));
  if (problem) return { ok: false, message: problem };
  const type = typeOf(code)!;
  const created = await db.orm.public.Account.create({ tenantId, code, name: input.name.trim().slice(0, 120), type, nature: natureOf(type), postable: true });
  return { ok: true, id: created.id };
}

/** Desactivar una cuenta la oculta de los asientos nuevos; no toca lo ya contabilizado. */
export async function setAccountActive(tenantId: string, id: string, active: boolean): Promise<boolean> {
  const a = await db.orm.public.Account.where({ tenantId, id }).first();
  if (!a) return false;
  await db.orm.public.Account.where({ tenantId, id }).update({ active });
  return true;
}

export type RuleRow = { id: string; event: string; name: string; active: boolean; lines: RuleLine[] };

export async function listRules(tenantId: string): Promise<RuleRow[]> {
  const rows = await db.orm.public.AccountingRule.where({ tenantId }).all();
  return rows.map((r) => ({ id: r.id, event: r.event, name: r.name, active: r.active, lines: r.lines as unknown as RuleLine[] })).sort((a, b) => DEFAULT_RULES.findIndex((d) => d.event === a.event) - DEFAULT_RULES.findIndex((d) => d.event === b.event));
}

/** Activa o desactiva una regla; no se puede activar una cuyas cuentas ya no existen o están apagadas. */
export async function setRuleActive(tenantId: string, id: string, active: boolean): Promise<{ ok: true } | { ok: false; message: string }> {
  const r = await db.orm.public.AccountingRule.where({ tenantId, id }).first();
  if (!r) return { ok: false, message: "No se encontró la regla." };
  if (active) {
    const codes = (await listAccounts(tenantId)).filter((a) => a.active && a.postable).map((a) => a.code);
    const problem = validateRule(r.lines as unknown as RuleLine[], codes);
    if (problem) return { ok: false, message: problem };
  }
  await db.orm.public.AccountingRule.where({ tenantId, id }).update({ active });
  return { ok: true };
}

export type CostCenterRow = { id: string; code: string; name: string; kind: "CENTER" | "BRANCH"; active: boolean };

export async function listCostCenters(tenantId: string): Promise<CostCenterRow[]> {
  const rows = await db.orm.public.CostCenter.where({ tenantId }).all();
  return rows.map((c) => ({ id: c.id, code: c.code, name: c.name, kind: c.kind as CostCenterRow["kind"], active: c.active })).sort((a, b) => a.code.localeCompare(b.code));
}

export async function createCostCenter(tenantId: string, input: { code: string; name: string; kind: "CENTER" | "BRANCH" }): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{2,12}$/.test(code)) return { ok: false, message: "El código usa de 2 a 12 letras, números o guiones." };
  if (input.name.trim().length < 2) return { ok: false, message: "Escribe el nombre." };
  if (await db.orm.public.CostCenter.where({ tenantId, code }).select("id").first()) return { ok: false, message: "Ya existe un centro con ese código." };
  const c = await db.orm.public.CostCenter.create({ tenantId, code, name: input.name.trim().slice(0, 80), kind: input.kind === "BRANCH" ? "BRANCH" : "CENTER" });
  return { ok: true, id: c.id };
}

export async function setCostCenterActive(tenantId: string, id: string, active: boolean): Promise<boolean> {
  if (!(await db.orm.public.CostCenter.where({ tenantId, id }).select("id").first())) return false;
  await db.orm.public.CostCenter.where({ tenantId, id }).update({ active });
  return true;
}

/* ------------------------------ Períodos ------------------------------ */

export type PeriodRow = { year: number; month: number; status: "OPEN" | "CLOSED"; closedAt: string | null };

export async function listPeriods(tenantId: string): Promise<PeriodRow[]> {
  const rows = await db.orm.public.AccountingPeriod.where({ tenantId }).all();
  return rows.map((p) => ({ year: p.year, month: p.month, status: p.status as PeriodRow["status"], closedAt: p.closedAt ? String(p.closedAt) : null })).sort((a, b) => b.year - a.year || b.month - a.month);
}

/** ¿El mes de esa fecha (AAAA-MM-DD) admite movimientos? Un mes sin registro está abierto. */
export async function isPeriodOpen(tenantId: string, date: string, tx: Writer = { orm: db.orm }): Promise<boolean> {
  const { year, month } = periodOfDate(date);
  const p = await tx.orm.public.AccountingPeriod.where({ tenantId, year, month }).select("status").first();
  return !p || p.status === "OPEN";
}

/** Falla con un mensaje legible si el mes está cerrado: lo usa el motor contable antes de escribir. */
export async function assertPeriodOpen(tenantId: string, date: string, tx: Writer = { orm: db.orm }): Promise<void> {
  if (!(await isPeriodOpen(tenantId, date, tx))) {
    const { year, month } = periodOfDate(date);
    throw new PeriodClosedError(`El período ${String(month).padStart(2, "0")}/${year} está cerrado: no admite cambios.`);
  }
}
export class PeriodClosedError extends Error {}

/**
 * Cierra un mes. Solo se cierra un mes que ya terminó (no el actual ni uno futuro) y si el anterior con
 * movimiento registrado ya está cerrado: los cierres van en orden.
 */
export async function closePeriod(tenantId: string, year: number, month: number, userId: string, today = todayCO()): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(Number.isInteger(year) && month >= 1 && month <= 12)) return { ok: false, message: "Mes inválido." };
  const key = year * 12 + (month - 1);
  const current = Number(today.slice(0, 4)) * 12 + (Number(today.slice(5, 7)) - 1);
  if (key >= current) return { ok: false, message: "Solo se cierra un mes que ya terminó." };
  const all = await listPeriods(tenantId);
  const earlierOpen = all.find((p) => p.status === "OPEN" && p.year * 12 + (p.month - 1) < key);
  if (earlierOpen) return { ok: false, message: `Primero cierra ${String(earlierOpen.month).padStart(2, "0")}/${earlierOpen.year}: los cierres van en orden.` };
  await db.orm.public.AccountingPeriod.upsert({ create: { tenantId, year, month, status: "CLOSED", closedAt: instant(), closedById: userId }, update: { status: "CLOSED", closedAt: instant(), closedById: userId }, conflictOn: { tenantId, year, month } });
  return { ok: true };
}

/** Reabrir un mes cerrado exige un motivo y queda registrado; solo si ningún mes posterior está cerrado. */
export async function reopenPeriod(tenantId: string, year: number, month: number, reason: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (reason.trim().length < 5) return { ok: false, message: "Escribe el motivo de la reapertura." };
  const all = await listPeriods(tenantId);
  const key = year * 12 + (month - 1);
  const later = all.find((p) => p.status === "CLOSED" && p.year * 12 + (p.month - 1) > key);
  if (later) return { ok: false, message: `Primero reabre ${String(later.month).padStart(2, "0")}/${later.year}: se reabre del más reciente al más antiguo.` };
  const p = await db.orm.public.AccountingPeriod.where({ tenantId, year, month }).first();
  if (!p || p.status !== "CLOSED") return { ok: false, message: "Ese mes no está cerrado." };
  await db.orm.public.AccountingPeriod.where({ tenantId, year, month }).update({ status: "OPEN", reopenedAt: instant(), note: reason.trim().slice(0, 200) });
  return { ok: true };
}
