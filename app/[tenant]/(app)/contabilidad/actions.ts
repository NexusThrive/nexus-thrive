"use server";

import { revalidatePath } from "next/cache";
import { closePeriod, createAccount, createCostCenter, reopenPeriod, seedAccounting, setAccountActive, setCostCenterActive, setRuleActive } from "@/lib/accounting/accounting-db";
import { listEntries, setAccountingEnabled, verifyLedger } from "@/lib/accounting/ledger-db";
import { REPORTS, buildReport, ledgerRows, type ReportKind, type ReportResult } from "@/lib/accounting/reports-db";
import { can } from "@/lib/business/permissions";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type AccResult = { ok: true; message: string } | { ok: false; message: string };
const DENIED: AccResult = { ok: false, message: "Solo el dueño o administración maneja la contabilidad." };
const refresh = (slug: string) => revalidatePath(`/${slug}/contabilidad`);
const manager = async (slug: string) => {
  const ctx = await requireTenantContext(slug, "/contabilidad");
  return ctx && can(ctx.role, "business.manage") ? ctx : null;
};

export async function loadPucAction(slug: string): Promise<AccResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await seedAccounting(ctx.tenantId);
  refresh(slug);
  return { ok: true, message: r.accounts + r.rules ? `${r.accounts} cuentas y ${r.rules} reglas cargadas` : "Ya tienes el plan completo" };
}

export async function createAccountAction(slug: string, code: string, name: string): Promise<AccResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await createAccount(ctx.tenantId, { code, name });
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ACCOUNTING", { action: "account.create", code });
  refresh(slug);
  return { ok: true, message: "Cuenta creada" };
}

export async function toggleAccountAction(slug: string, id: string, active: boolean): Promise<AccResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  if (!(await setAccountActive(ctx.tenantId, id, active))) return { ok: false, message: "No se encontró la cuenta." };
  await logTenantAction(ctx, "BIZ_ACCOUNTING", { action: active ? "account.activate" : "account.deactivate", id });
  refresh(slug);
  return { ok: true, message: active ? "Cuenta activada" : "Cuenta desactivada" };
}

export async function toggleRuleAction(slug: string, id: string, active: boolean): Promise<AccResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await setRuleActive(ctx.tenantId, id, active);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ACCOUNTING", { action: active ? "rule.activate" : "rule.deactivate", id });
  refresh(slug);
  return { ok: true, message: active ? "Regla activada" : "Regla desactivada" };
}

export async function createCostCenterAction(slug: string, code: string, name: string, kind: string): Promise<AccResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await createCostCenter(ctx.tenantId, { code, name, kind: kind === "BRANCH" ? "BRANCH" : "CENTER" });
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ACCOUNTING", { action: "costcenter.create", code });
  refresh(slug);
  return { ok: true, message: "Centro de costo creado" };
}

export async function toggleCostCenterAction(slug: string, id: string, active: boolean): Promise<AccResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  if (!(await setCostCenterActive(ctx.tenantId, id, active))) return { ok: false, message: "No se encontró el centro." };
  refresh(slug);
  return { ok: true, message: active ? "Centro activado" : "Centro desactivado" };
}

export async function closePeriodAction(slug: string, year: number, month: number): Promise<AccResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await closePeriod(ctx.tenantId, year, month, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ACCOUNTING", { action: "period.close", year, month });
  refresh(slug);
  return { ok: true, message: `Mes ${String(month).padStart(2, "0")}/${year} cerrado` };
}

export async function reopenPeriodAction(slug: string, year: number, month: number, reason: string): Promise<AccResult> {
  const ctx = await requireTenantContext(slug, "/contabilidad");
  if (!ctx || !can(ctx.role, "business.setup")) return { ok: false, message: "Solo el dueño reabre un mes cerrado." };
  const r = await reopenPeriod(ctx.tenantId, year, month, reason);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ACCOUNTING", { action: "period.reopen", year, month, reason: reason.slice(0, 120) });
  refresh(slug);
  return { ok: true, message: `Mes ${String(month).padStart(2, "0")}/${year} reabierto` };
}

export async function setEnabledAction(slug: string, enabled: boolean): Promise<AccResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await setAccountingEnabled(ctx.tenantId, enabled);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ACCOUNTING", { action: enabled ? "auto.enable" : "auto.disable" });
  refresh(slug);
  return { ok: true, message: enabled ? "Contabilización automática activada: cada venta, cobro, nota y compra deja su asiento" : "Contabilización automática desactivada" };
}

export async function verifyLedgerAction(slug: string): Promise<AccResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await verifyLedger(ctx.tenantId);
  return r.ok ? { ok: true, message: `Libro íntegro: ${r.checked} asientos revisados, todos cuadran y el encadenado está intacto` } : { ok: false, message: `Asiento ${r.brokenAt}: ${r.reason}` };
}

export type { EntryRow } from "@/lib/accounting/ledger-db";
void listEntries;

/** Un informe contable en pantalla para un rango de fechas (los mismos datos que baja el contador en CSV). */
export async function reportAction(slug: string, kind: string, from: string, to: string, account: string): Promise<{ ok: true; report: ReportResult } | { ok: false; message: string }> {
  const ctx = await manager(slug);
  if (!ctx) return { ok: false, message: DENIED.message };
  if (!(REPORTS as readonly string[]).includes(kind)) return { ok: false, message: "Elige un informe." };
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (!date.test(from) || !date.test(to) || from > to) return { ok: false, message: "Revisa las fechas: «desde» no puede ser posterior a «hasta»." };
  if ((kind === "ledger" || kind === "auxiliary") && !/^\d{4,10}$/.test(account)) return { ok: false, message: "Escribe el código de la cuenta (por ejemplo 1305)." };
  return { ok: true, report: buildReport(kind as ReportKind, await ledgerRows(ctx.tenantId, from, to), account) };
}
