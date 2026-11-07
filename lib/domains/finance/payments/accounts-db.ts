import { toNumber } from "@/lib/foundation/format";
import { db } from "@/prisma/db";
import { validateTariff, type FeeTariff } from "./intents";

/**
 * Cuentas financieras (HU-tesoreria-01, D-9): dónde está el dinero del negocio —caja, banco o pasarela— y, en las
 * pasarelas, la tarifa para estimar la comisión de cada cobro. `CashBox` sigue siendo la caja física con sus turnos.
 * Todo por `tenantId`.
 */
export type AccountKind = "CASH" | "BANK" | "GATEWAY";
export type FinancialAccountRow = { id: string; kind: AccountKind; name: string; provider: string | null; tariff: FeeTariff; ledgerAccount: string; active: boolean };

/** Código del plan de cuentas donde vive el saldo de cada tipo de cuenta. */
export const LEDGER_OF: Record<AccountKind, string> = { CASH: "1105", BANK: "1110", GATEWAY: "1340" };

const toRow = (a: Record<string, unknown>): FinancialAccountRow => ({
  id: String(a.id),
  kind: a.kind as AccountKind,
  name: String(a.name),
  provider: (a.provider as string | null) ?? null,
  tariff: { feePct: toNumber(a.feePct as never), feeFixed: toNumber(a.feeFixed as never), feeVatPct: toNumber(a.feeVatPct as never) },
  ledgerAccount: String(a.ledgerAccount),
  active: Boolean(a.active),
});

const NAMES: Record<string, string> = { wompi: "Wompi", sandbox: "Pasarela de prueba" };

/** La cuenta de pasarela del proveedor: la crea la primera vez (sin tarifa, hasta que el negocio la configure). */
export async function ensureGatewayAccount(tenantId: string, provider: string): Promise<FinancialAccountRow> {
  const found = await db.orm.public.FinancialAccount.where({ tenantId, kind: "GATEWAY", provider }).first();
  if (found) return toRow(found as unknown as Record<string, unknown>);
  const created = await db.orm.public.FinancialAccount.create({ tenantId, kind: "GATEWAY", name: NAMES[provider] ?? provider, provider, ledgerAccount: LEDGER_OF.GATEWAY });
  return toRow(created as unknown as Record<string, unknown>);
}

/** La cuenta de pasarela de un proveedor si ya existe (sin crearla). */
export async function gatewayAccount(tenantId: string, provider: string): Promise<FinancialAccountRow | null> {
  const found = await db.orm.public.FinancialAccount.where({ tenantId, kind: "GATEWAY", provider }).first();
  return found ? toRow(found as unknown as Record<string, unknown>) : null;
}

/** Fija la tarifa de la pasarela. Valida porcentajes y valor fijo. */
export async function setGatewayTariff(tenantId: string, provider: string, tariff: FeeTariff): Promise<{ ok: true } | { ok: false; message: string }> {
  const problem = validateTariff(tariff);
  if (problem) return { ok: false, message: problem };
  const account = await ensureGatewayAccount(tenantId, provider);
  await db.orm.public.FinancialAccount.where({ tenantId, id: account.id }).update({ feePct: tariff.feePct.toFixed(4), feeFixed: tariff.feeFixed.toFixed(2), feeVatPct: tariff.feeVatPct.toFixed(4) });
  return { ok: true };
}

/** Cuentas financieras del negocio, por tipo y nombre. */
export async function listFinancialAccounts(tenantId: string): Promise<FinancialAccountRow[]> {
  const rows = await db.orm.public.FinancialAccount.where({ tenantId }).orderBy((a) => a.kind.asc()).all();
  return rows.map((r) => toRow(r as unknown as Record<string, unknown>)).sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name, "es"));
}
