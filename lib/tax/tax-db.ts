import { toNumber } from "@/lib/format";
import { db } from "@/prisma/db";
import { DEFAULT_TAX_RATES, NUMBERED_KINDS, computeWithholdings, overlaps, rateInForce, resolutionStatus, todayCO, validateResolution, validateTaxRate, type ResolutionStatus, type TaxKind, type TaxRateRow, type Withholding } from "./tax";

/**
 * Impuestos con vigencia y numeración por resolución (servidor). Todo con
 * `tenantId`. Las funciones que corren dentro de la creación de un documento
 * reciben su transacción (`Writer`) para que el consecutivo y el documento
 * se confirmen o se deshagan juntos.
 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Writer = Pick<Tx, "orm">;

export type TaxResult<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const asDate = (d: string) => Temporal.Instant.from(`${d}T00:00:00Z`);
const iso = (i: { toString(): string }) => i.toString().slice(0, 10);
const dec = (n: number) => n.toFixed(2);

const toRate = (r: Record<string, unknown>): TaxRateRow => ({
  id: String(r.id),
  code: String(r.code),
  name: String(r.name),
  kind: String(r.kind) as TaxKind,
  ratePct: toNumber(r.ratePct as never),
  minBase: toNumber(r.minBase as never),
  validFrom: iso(r.validFrom as { toString(): string }),
  validTo: r.validTo ? iso(r.validTo as { toString(): string }) : null,
  active: Boolean(r.active),
});

export async function listTaxRates(tenantId: string): Promise<TaxRateRow[]> {
  const rows = await db.orm.public.TaxRate.where({ tenantId }).all();
  return rows.map((r) => toRate(r as unknown as Record<string, unknown>)).sort((a, b) => a.kind.localeCompare(b.kind) || a.code.localeCompare(b.code) || b.validFrom.localeCompare(a.validFrom));
}

export async function createTaxRate(tenantId: string, input: { code: string; name: string; kind: string; ratePct: number; minBase?: number; validFrom: string; validTo?: string | null }): Promise<TaxResult<{ id: string }>> {
  const code = input.code.trim().toUpperCase();
  const minBase = input.minBase ?? 0;
  const validTo = input.validTo ?? null;
  const problem = validateTaxRate({ code, name: input.name, kind: input.kind, ratePct: input.ratePct, minBase, validFrom: input.validFrom, validTo });
  if (problem) return { ok: false, message: problem };
  const same = (await listTaxRates(tenantId)).filter((r) => r.code === code && r.active);
  const clash = same.find((r) => overlaps(r, { validFrom: input.validFrom, validTo }));
  if (clash) return { ok: false, message: `Ya hay una tarifa ${code} vigente en esas fechas (${clash.validFrom} a ${clash.validTo ?? "sin fin"}). Termina esa vigencia antes de crear la nueva.` };
  const created = await db.orm.public.TaxRate.create({ tenantId, code, name: input.name.trim().slice(0, 80), kind: input.kind, ratePct: dec(input.ratePct), minBase: dec(minBase), validFrom: asDate(input.validFrom), validTo: validTo ? asDate(validTo) : null, active: true });
  return { ok: true, id: created.id };
}

/** Cierra una vigencia (la fecha final) o apaga/enciende la tarifa. Las ventas ya hechas conservan lo que cobraron. */
export async function updateTaxRate(tenantId: string, id: string, patch: { active?: boolean; validTo?: string | null }): Promise<TaxResult> {
  const row = await db.orm.public.TaxRate.where({ tenantId, id }).first();
  if (!row) return { ok: false, message: "No se encontró la tarifa." };
  const data: Record<string, unknown> = {};
  if (patch.active !== undefined) data.active = patch.active;
  if (patch.validTo !== undefined) {
    if (patch.validTo !== null && patch.validTo < iso(row.validFrom as never)) return { ok: false, message: "La vigencia debe terminar después de empezar." };
    data.validTo = patch.validTo ? asDate(patch.validTo) : null;
  }
  await db.orm.public.TaxRate.where({ tenantId, id }).update(data);
  return { ok: true };
}

/** Carga las tarifas habituales que aún no existan (por código). Idempotente. */
export async function ensureDefaultTaxes(tenantId: string): Promise<{ created: number }> {
  const have = new Set((await listTaxRates(tenantId)).map((r) => r.code));
  let created = 0;
  for (const d of DEFAULT_TAX_RATES) {
    if (have.has(d.code)) continue;
    await db.orm.public.TaxRate.create({ tenantId, code: d.code, name: d.name, kind: d.kind, ratePct: dec(d.ratePct), minBase: "0.00", validFrom: asDate("2017-01-01"), validTo: null, active: true });
    created++;
  }
  return { created };
}

/** Tarifas de IVA e impoconsumo vigentes hoy, para elegir en los documentos. */
export async function activeSalesTaxes(tenantId: string, date = todayCO()): Promise<TaxRateRow[]> {
  return (await listTaxRates(tenantId)).filter((r) => (r.kind === "IVA" || r.kind === "IMPOCONSUMO") && rateInForce([r], r.code, date));
}

/** Las retenciones vigentes en la fecha para los códigos pedidos (los que no estén vigentes se ignoran). */
export async function withholdingsFor(tx: Writer, tenantId: string, codes: readonly string[], totals: { taxable: number; tax: number }, date: string): Promise<Withholding[]> {
  if (!codes.length) return [];
  const rows = (await tx.orm.public.TaxRate.where({ tenantId }).all()).map((r) => toRate(r as unknown as Record<string, unknown>));
  const picked = codes.map((c) => rateInForce(rows, c, date)).filter((r): r is TaxRateRow => r !== null);
  return computeWithholdings(totals, picked);
}

/* ------------------------------ Resoluciones ------------------------------ */

export type ResolutionRow = {
  id: string;
  documentKind: string;
  prefix: string;
  resolutionNumber: string;
  rangeFrom: number;
  rangeTo: number;
  nextNumber: number;
  validFrom: string;
  validTo: string;
  active: boolean;
  status: ResolutionStatus;
};

const toResolution = (r: Record<string, unknown>, today: string): ResolutionRow => {
  const base = {
    id: String(r.id),
    documentKind: String(r.documentKind),
    prefix: String(r.prefix ?? ""),
    resolutionNumber: String(r.resolutionNumber),
    rangeFrom: Number(r.rangeFrom),
    rangeTo: Number(r.rangeTo),
    nextNumber: Number(r.nextNumber),
    validFrom: iso(r.validFrom as { toString(): string }),
    validTo: iso(r.validTo as { toString(): string }),
    active: Boolean(r.active),
  };
  return { ...base, status: resolutionStatus(base, today) };
};

export async function listResolutions(tenantId: string, today = todayCO()): Promise<ResolutionRow[]> {
  const rows = await db.orm.public.NumberingResolution.where({ tenantId }).all();
  return rows.map((r) => toResolution(r as unknown as Record<string, unknown>, today)).sort((a, b) => a.documentKind.localeCompare(b.documentKind) || b.validFrom.localeCompare(a.validFrom));
}

export async function createResolution(tenantId: string, input: { documentKind: string; prefix?: string; resolutionNumber: string; rangeFrom: number; rangeTo: number; validFrom: string; validTo: string }): Promise<TaxResult<{ id: string; nextNumber: number }>> {
  const prefix = (input.prefix ?? "").trim().toUpperCase();
  const problem = validateResolution({ ...input, prefix }, NUMBERED_KINDS);
  if (problem) return { ok: false, message: problem };
  const existing = await db.orm.public.NumberingResolution.where({ tenantId, documentKind: input.documentKind, active: true }).all();
  const clash = existing.find((r) => String(r.prefix ?? "") === prefix && Number(r.rangeFrom) <= input.rangeTo && input.rangeFrom <= Number(r.rangeTo));
  if (clash) return { ok: false, message: `El rango se cruza con la resolución ${clash.resolutionNumber} (${clash.rangeFrom}–${clash.rangeTo}) del mismo prefijo.` };
  // Lo ya emitido de ese tipo no se repite: se sigue después del último número usado.
  const { top } = await db.orm.public.Invoice.where({ tenantId, kind: input.documentKind }).aggregate((a) => ({ top: a.max("number") }));
  const nextNumber = Math.max(input.rangeFrom, (top ?? 0) + 1);
  if (nextNumber > input.rangeTo) return { ok: false, message: `Ya emitiste hasta el número ${top}: el rango ${input.rangeFrom}–${input.rangeTo} no tiene números disponibles.` };
  const created = await db.orm.public.NumberingResolution.create({
    tenantId,
    documentKind: input.documentKind,
    prefix,
    resolutionNumber: input.resolutionNumber.trim().slice(0, 40),
    rangeFrom: input.rangeFrom,
    rangeTo: input.rangeTo,
    nextNumber,
    validFrom: asDate(input.validFrom),
    validTo: asDate(input.validTo),
    active: true,
  });
  return { ok: true, id: created.id, nextNumber };
}

export async function setResolutionActive(tenantId: string, id: string, active: boolean): Promise<boolean> {
  const row = await db.orm.public.NumberingResolution.where({ tenantId, id }).select("id").first();
  if (!row) return false;
  await db.orm.public.NumberingResolution.where({ tenantId, id }).update({ active });
  return true;
}

/** El documento no puede numerarse: hay resolución configurada pero ninguna sirve hoy. */
export class NumberingError extends Error {}

export type Allocation = { resolutionId: string; prefix: string; number: number };

/**
 * Número del próximo documento de ese tipo. Sin resolución configurada devuelve
 * `null` (consecutivo interno de siempre). Con resolución, entrega el siguiente
 * del rango de la que esté vigente; si hay resoluciones pero ninguna sirve
 * (vencida, agotada, apagada), lanza `NumberingError` con el motivo: no se
 * emite fuera de rango.
 */
export async function allocateNumber(tx: Writer, tenantId: string, kind: string, today = todayCO()): Promise<Allocation | null> {
  if (!(NUMBERED_KINDS as readonly string[]).includes(kind)) return null;
  const rows = (await tx.orm.public.NumberingResolution.where({ tenantId, documentKind: kind }).all()).map((r) => toResolution(r as unknown as Record<string, unknown>, today));
  if (!rows.length) return null;
  const usable = rows.filter((r) => r.status.state === "ok").sort((a, b) => a.validTo.localeCompare(b.validTo));
  const pick = usable[0];
  if (!pick) {
    const why = rows.find((r) => r.active && "message" in r.status)?.status;
    throw new NumberingError(why && "message" in why ? why.message : "No hay una resolución de numeración activa para este documento.");
  }
  return { resolutionId: pick.id, prefix: pick.prefix, number: pick.nextNumber };
}

/** Marca el número como usado (dentro de la misma transacción que el documento). */
export async function commitNumber(tx: Writer, tenantId: string, a: Allocation): Promise<void> {
  await tx.orm.public.NumberingResolution.where({ tenantId, id: a.resolutionId }).update({ nextNumber: a.number + 1 });
}
