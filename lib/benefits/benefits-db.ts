/**
 * Acceso a datos de los beneficios promocionales (tarjetas NFC/QR).
 *
 * Módulo de SERVIDOR. La lógica pura (normalización, generación, estado)
 * vive en `benefits.ts` y está cubierta por pruebas.
 */

import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { loadPricingConfig } from "@/lib/plans/settings";
import { resolveModules } from "@/lib/plans/pricing";
import { PLANS, type PlanKey } from "@/lib/plans/catalog";
import type { ModuleValue, VerticalValue } from "@/lib/admin/catalogs";
import {
  type BenefitKind,
  type BenefitStatus,
  benefitCopy,
  benefitEndMs,
  benefitStatus,
  benefitStatusMessage,
  generateBenefitCode,
  normalizeBenefitCode,
  normalizeBenefitKind,
} from "@/lib/benefits/benefits";

export const BENEFIT_COOKIE = "nx_benefit";

/**
 * Código del QR fijo impreso en las tarjetas (`{base}/c/ELITE30`). NUNCA se
 * cambia: rompería las tarjetas ya impresas. Se asegura en cada lectura y se
 * administra desde el panel (activar/desactivar y editar el beneficio).
 */
export const FIXED_BENEFIT_CODE = "ELITE30";

export type BenefitRow = {
  id: string;
  code: string;
  label: string;
  plan: string;
  kind: BenefitKind;
  durationDays: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type BenefitPublic = {
  code: string;
  label: string;
  plan: string;
  kind: BenefitKind;
  durationDays: number;
  status: BenefitStatus;
  message: string;
  /** Textos listos para la UI según el tipo de código. */
  copy: ReturnType<typeof benefitCopy>;
};

export type RedeemResult =
  | { ok: true; plan: string; kind: BenefitKind; endsAt: string }
  | { ok: false; reason: BenefitStatus | "not_found" | "already" | "error"; message: string };

/** Motivos por los que un canje puede fallar (se translate al mensaje). */
type RedeemReason = Extract<RedeemResult, { ok: false }>["reason"];

/** Error interno del canje: aborta la transacción con un motivo legible. */
class RedeemError extends Error {
  readonly reason: RedeemReason;
  constructor(reason: RedeemReason, message: string) {
    super(message);
    this.name = "RedeemError";
    this.reason = reason;
  }
}

/**
 * El ORM devuelve `Temporal.Instant` en los campos `DateTime`; normalizamos a
 * ISO string en el borde para que el resto del módulo (y la UI) trabajen con
 * valores serializables y `Date.parse` sea fiable.
 */
type RawBenefit = Record<string, unknown>;

function normalizeRow(raw: RawBenefit): BenefitRow {
  return {
    id: String(raw.id),
    code: String(raw.code),
    label: String(raw.label),
    plan: String(raw.plan),
    kind: normalizeBenefitKind(raw.kind),
    durationDays: Number(raw.durationDays),
    maxUses: raw.maxUses == null ? null : Number(raw.maxUses),
    usedCount: Number(raw.usedCount),
    active: Boolean(raw.active),
    expiresAt: raw.expiresAt == null ? null : String(raw.expiresAt),
    notes: raw.notes == null ? null : String(raw.notes),
    createdAt: String(raw.createdAt),
  };
}

/** Idempotente: crea el código del QR fijo si aún no existe. */
async function ensureFixedBenefit(): Promise<void> {
  try {
    const existing = await db.orm.public.BenefitCode.where({
      code: FIXED_BENEFIT_CODE,
    }).first();
    if (existing) return;
    await db.orm.public.BenefitCode.create({
      code: FIXED_BENEFIT_CODE,
      label: "Mes gratis Elite (QR fijo)",
      plan: "ELITE",
      durationDays: 30,
      maxUses: null,
      active: true,
      notes: "Código del QR impreso. No cambiar el código.",
    });
  } catch {
    // Si dos peticiones lo crean a la vez, el @unique decide; se ignora.
  }
}

function toPublic(row: BenefitRow): BenefitPublic {
  const status = benefitStatus(
    {
      active: row.active,
      expiresAt: row.expiresAt,
      usedCount: row.usedCount,
      maxUses: row.maxUses,
    },
    Date.now(),
  );
  const planName = PLANS[row.plan as PlanKey]?.name ?? row.plan;
  return {
    code: row.code,
    label: row.label,
    plan: row.plan,
    kind: row.kind,
    durationDays: row.durationDays,
    status,
    message: benefitStatusMessage(status),
    copy: benefitCopy(row.kind, { planName, durationDays: row.durationDays }),
  };
}

/** Busca un código por su valor normalizado. Devuelve null si no existe. */
export async function getBenefitByCode(raw: string): Promise<BenefitPublic | null> {
  const code = normalizeBenefitCode(raw);
  if (!code) return null;
  if (code === FIXED_BENEFIT_CODE) await ensureFixedBenefit();
  const found = await db.orm.public.BenefitCode.where({ code }).first();
  if (!found) return null;
  return toPublic(normalizeRow(found as RawBenefit));
}

/** Lista los códigos para el panel, con sus canjes ordenados. */
export async function listBenefitCodes(): Promise<
  (BenefitRow & { status: BenefitStatus; redemptions: number })[]
> {
  await ensureFixedBenefit();
  const [found, redemptions] = await Promise.all([
    db.orm.public.BenefitCode.all(),
    db.orm.public.BenefitRedemption.all(),
  ]);  const counts = new Map<string, number>();
  for (const redemption of redemptions) {
    counts.set(redemption.codeId, (counts.get(redemption.codeId) ?? 0) + 1);
  }
  return found
    .map((row) => normalizeRow(row as unknown as RawBenefit))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((row) => ({
      ...row,
      status: benefitStatus(
        { active: row.active, expiresAt: row.expiresAt, usedCount: row.usedCount, maxUses: row.maxUses },
        Date.now(),
      ),
      redemptions: counts.get(row.id) ?? 0,
    }));
}

export type CreateBenefitInput = {
  code?: string;
  label: string;
  plan?: string;
  kind?: BenefitKind;
  durationDays?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  notes?: string | null;
};

/** Crea un código. Si no se pasa `code`, se genera uno legible. */
export async function createBenefitCode(
  input: CreateBenefitInput,
  staffId: string | null,
): Promise<{ ok: true; code: string } | { ok: false; message: string }> {
  const label = input.label.trim();
  if (!label) return { ok: false, message: "Ponle un nombre al beneficio." };

  const durationDays = clampInt(input.durationDays, 30, 1, 365);
  const planInput = (input.plan ?? "ELITE").toUpperCase();
  if (!["ESSENTIAL", "ELITE", "SIGNATURE"].includes(planInput)) {
    return { ok: false, message: "Plan no válido." };
  }
  const plan = planInput as PlanKey;
  const kind = normalizeBenefitKind(input.kind);
  const maxUses =
    input.maxUses == null ? null : clampInt(input.maxUses, 0, 0, 1_000_000) || null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = normalizeBenefitCode(input.code ?? generateBenefitCode());
    if (!code) return { ok: false, message: "Código no válido." };
    const taken = await db.orm.public.BenefitCode.where({ code }).first();
    if (taken) {
      if (input.code) return { ok: false, message: "Ese código ya existe." };
      continue;
    }
    try {
      await db.orm.public.BenefitCode.create({
        code,
        label,
        plan,
        kind,
        durationDays,
        maxUses,
        expiresAt: input.expiresAt
          ? Temporal.Instant.fromEpochMilliseconds(Date.parse(input.expiresAt))
          : null,
        notes: input.notes?.trim() || null,
        createdById: staffId,
      });
      return { ok: true, code };
    } catch {
      if (input.code) return { ok: false, message: "Ese código ya existe." };
    }
  }
  return { ok: false, message: "No se pudo generar un código único. Inténtalo de nuevo." };
}

export async function setBenefitActive(
  id: string,
  active: boolean,
): Promise<void> {
  await db.orm.public.BenefitCode.where({ id }).update({ active });
}

export type UpdateBenefitInput = {
  label: string;
  plan: string;
  kind?: BenefitKind;
  durationDays: number;
  maxUses: number | null;
  expiresAt: string | null;
  notes: string | null;
};

/**
 * Edita un código existente (plan, tipo, días, usos, vencimiento, notas,
 * nombre). El `code` NO se toca: es lo que va grabado en el QR/NFC impreso.
 */
export async function updateBenefitCode(
  id: string,
  input: UpdateBenefitInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const label = input.label.trim();
  if (!label) return { ok: false, message: "Ponle un nombre al beneficio." };

  const planInput = (input.plan ?? "ELITE").toUpperCase();
  if (!["ESSENTIAL", "ELITE", "SIGNATURE"].includes(planInput)) {
    return { ok: false, message: "Plan no válido." };
  }
  const durationDays = clampInt(input.durationDays, 30, 1, 365);
  const maxUses =
    input.maxUses == null ? null : clampInt(input.maxUses, 0, 0, 1_000_000) || null;

  try {
    await db.orm.public.BenefitCode.where({ id }).update({
      label,
      plan: planInput as PlanKey,
      kind: normalizeBenefitKind(input.kind),
      durationDays,
      maxUses,
      expiresAt: input.expiresAt
        ? Temporal.Instant.fromEpochMilliseconds(Date.parse(input.expiresAt))
        : null,
      notes: input.notes?.trim() || null,
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "No se pudo guardar. Inténtalo de nuevo." };
  }
}

/**
 * Canjea un código para un negocio: lo deja 30 días (o los configurados) en el
 * plan del beneficio, sin costo. Idempotente por negocio (no se puede canjear
 * el mismo código dos veces).
 */
export async function redeemBenefit(params: {
  code: string;
  tenantId: string;
  tenantName: string;
  clerkUserId?: string | null;
  email?: string | null;
}): Promise<RedeemResult> {
  const code = normalizeBenefitCode(params.code);
  if (!code) return { ok: false, reason: "not_found", message: "Código no válido." };

  const found = await db.orm.public.BenefitCode.where({ code }).first();
  if (!found) {
    return { ok: false, reason: "not_found", message: "Este código no existe." };
  }
  const row = normalizeRow(found as RawBenefit);

  const status = benefitStatus(
    { active: row.active, expiresAt: row.expiresAt, usedCount: row.usedCount, maxUses: row.maxUses },
    Date.now(),
  );
  if (status !== "active") {
    return { ok: false, reason: status, message: benefitStatusMessage(status) };
  }

  const already = await db.orm.public.BenefitRedemption.where({
    codeId: row.id,
    tenantId: params.tenantId,
  }).first();
  if (already) {
    return {
      ok: false,
      reason: "already",
      message: "Este negocio ya canjeó este beneficio.",
    };
  }

  const tenant = (await db.orm.public.Tenant.where({ id: params.tenantId })
    .select("id", "vertical")
    .first()) as { id: string; vertical: VerticalValue } | null;
  if (!tenant) {
    return { ok: false, reason: "error", message: "El negocio ya no existe." };
  }

  const config = await loadPricingConfig();
  const plan = row.plan as PlanKey;
  const modules = resolveModules(config, plan, tenant.vertical, []);
  const startMs = Date.now();
  const endMs = benefitEndMs(startMs, row.durationDays);
  const start = Temporal.Instant.fromEpochMilliseconds(startMs);
  const end = Temporal.Instant.fromEpochMilliseconds(endMs);
  const note = `Beneficio ${code} (${row.durationDays} días)`;

  try {
    await db.transaction(async (tx) => {
      // Consumo ATÓMICO del uso. El update condicional se hace con el
      // constructor SQL (el ORM resuelve `where` como lectura + escritura, que
      // no es atómico): el WHERE exige que el contador siga igual al que se
      // leyó y que no se haya agotado el tope. Si otra transacción consumió
      // antes, el UPDATE no afecta filas y se reintenta con la lectura nueva;
      // si el tope se alcanzó, se aborta. Así un código de un solo uso no se
      // puede regalar dos veces.
      let consumed = false;
      let failure: { reason: RedeemReason; message: string } | null = null;

      for (let attempt = 0; attempt < 3 && !consumed; attempt += 1) {
        const freshRaw = await tx.orm.public.BenefitCode.where({ id: row.id }).first();
        if (!freshRaw) {
          failure = { reason: "not_found", message: "Este código ya no existe." };
          break;
        }
        const fresh = normalizeRow(freshRaw as RawBenefit);
        const status = benefitStatus(
          {
            active: fresh.active,
            expiresAt: fresh.expiresAt,
            usedCount: fresh.usedCount,
            maxUses: fresh.maxUses,
          },
          Date.now(),
        );
        if (status !== "active") {
          failure = { reason: status, message: benefitStatusMessage(status) };
          break;
        }

        // El WHERE exige que el contador siga igual al leído: si otra
        // transacción consumió antes, el UPDATE no afecta filas y se reintenta
        // con la lectura nueva (ahí el estado vuelve a validar el tope).
        const plan = tx.sql.public.BenefitCode
          .update({ usedCount: fresh.usedCount + 1 })
          .where((f, fns) =>
            fns.and(
              fns.eq(f.id, fresh.id),
              fns.eq(f.usedCount, fresh.usedCount),
            ),
          )
          .returning("usedCount")
          .build();
        const updated = await tx.query(plan);
        consumed = updated.length > 0;
      }

      if (!consumed) {
        if (failure) throw new RedeemError(failure.reason, failure.message);
        throw new RedeemError("exhausted", benefitStatusMessage("exhausted"));
      }

      await tx.orm.public.BenefitRedemption.create({
        codeId: row.id,
        tenantId: params.tenantId,
        tenantName: params.tenantName,
        plan: row.plan,
        kind: row.kind,
        durationDays: row.durationDays,
        startsAt: start,
        endsAt: end,
        clerkUserId: params.clerkUserId ?? null,
        email: params.email ?? null,
      });

      await tx.orm.public.Tenant.where({ id: params.tenantId }).update({
        plan,
        billingCycle: "MONTHLY",
        planMonthlyUsdCents: 0,
        planSelectedAt: start,
        contractedModules: modules as ModuleValue[],
      });

      const selected = new Set<string>(modules);
      const existing = await tx.orm.public.TenantModule.where({
        tenantId: params.tenantId,
      }).all();
      for (const moduleRow of existing) {
        if (!selected.has(moduleRow.moduleName)) {
          await tx.orm.public.TenantModule.where({ id: moduleRow.id }).update({ active: false });
        }
      }
      for (const moduleName of modules) {
        await tx.orm.public.TenantModule.upsert({
          create: { tenantId: params.tenantId, moduleName },
          update: { active: true },
          conflictOn: { tenantId: params.tenantId, moduleName },
        });
      }

      await tx.orm.public.Subscription.upsert({
        create: {
          tenantId: params.tenantId,
          plan,
          billingCycle: "MONTHLY",
          priceUsdCents: 0,
          status: "TRIAL",
          currentPeriodStart: start,
          currentPeriodEnd: end,
          notes: note,
        },
        update: {
          plan,
          billingCycle: "MONTHLY",
          priceUsdCents: 0,
          status: "TRIAL",
          currentPeriodStart: start,
          currentPeriodEnd: end,
          notes: note,
          cancelledAt: null,
          cancelReason: null,
        },
        conflictOn: { tenantId: params.tenantId },
      });
    });
  } catch (error) {
    if (error instanceof RedeemError) {
      return { ok: false, reason: error.reason, message: error.message };
    }
    return {
      ok: false,
      reason: "error",
      message: "No se pudo aplicar el beneficio. Inténtalo de nuevo.",
    };
  }

  try {
    await createAdminDb().logAudit({
      actorId: params.clerkUserId ?? "system",
      actorEmail: params.email ?? null,
      action: "BENEFIT_REDEEM",
      targetTenantId: params.tenantId,
      targetTenantName: params.tenantName,
      metadata: { code, plan: row.plan, kind: row.kind, durationDays: row.durationDays },
    });
  } catch {
    // La auditoría nunca rompe el canje.
  }

  return { ok: true, plan: row.plan, kind: row.kind, endsAt: end.toString() };
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value == null || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/**
 * Vencimiento perezoso del acceso. Si la suscripción del negocio está en
 * TRIAL (el período que da un código) y ya pasó su `currentPeriodEnd`, se
 * revierte el negocio al plan Essential (gratis), se ajustan sus módulos y la
 * suscripción queda en el plan gratuito. Idempotente y silencioso: nunca rompe
 * la carga de la app. Se invoca desde el layout del tenant.
 */
export async function expireBenefitTrial(tenantId: string): Promise<void> {
  const sub = await db.orm.public.Subscription.where({ tenantId }).first();
  if (!sub || sub.status !== "TRIAL") return;

  const endMs = sub.currentPeriodEnd ? Date.parse(String(sub.currentPeriodEnd)) : 0;
  if (!endMs || endMs > Date.now()) return;

  const tenant = (await db.orm.public.Tenant.where({ id: tenantId })
    .select("id", "vertical", "plan")
    .first()) as { id: string; vertical: VerticalValue; plan: string } | null;
  if (!tenant) return;
  // Ya revertido: nada que hacer (evita reescrituras en cada carga).
  if (tenant.plan === "ESSENTIAL") return;

  const config = await loadPricingConfig();
  const modules = resolveModules(config, "ESSENTIAL", tenant.vertical, []);

  try {
    await db.transaction(async (tx) => {
      await tx.orm.public.Tenant.where({ id: tenantId }).update({
        plan: "ESSENTIAL",
        billingCycle: "MONTHLY",
        planMonthlyUsdCents: 0,
        contractedModules: modules as ModuleValue[],
      });

      const selected = new Set<string>(modules);
      const existing = await tx.orm.public.TenantModule.where({ tenantId }).all();
      for (const row of existing) {
        if (!selected.has(row.moduleName)) {
          await tx.orm.public.TenantModule.where({ id: row.id }).update({ active: false });
        }
      }
      for (const moduleName of modules) {
        await tx.orm.public.TenantModule.upsert({
          create: { tenantId, moduleName },
          update: { active: true },
          conflictOn: { tenantId, moduleName },
        });
      }

      // La suscripción pasa al plan gratuito: `TRIAL` es solo el período del
      // código (regalo o acceso pagado) y, al vencer, el negocio sigue en
      // Essential. No existe un estado "EXPIRED" en el contrato.
      await tx.orm.public.Subscription.where({ tenantId }).update({
        plan: "ESSENTIAL",
        priceUsdCents: 0,
        status: "ACTIVE",
        notes: "Acceso por código vencido; el negocio sigue en el plan gratuito.",
      });
    });
  } catch {
    // El vencimiento nunca debe romper la carga de la app.
  }
}

/** Acceso vigente de un negocio (último canje): tipo, plan y hasta cuándo. */
export type TenantAccess = {
  kind: BenefitKind;
  plan: string;
  durationDays: number;
  startsAt: string;
  endsAt: string;
  expired: boolean;
};

/**
 * Último canje de un negocio, para mostrar en Ajustes si el acceso es
 * "cortesía" (promo) o "pagado" y hasta qué día. `null` si nunca canjeó.
 */
export async function getTenantAccess(tenantId: string): Promise<TenantAccess | null> {
  const rows = await db.orm.public.BenefitRedemption.where({ tenantId }).all();
  if (rows.length === 0) return null;
  const latest = rows
    .map((row) => row as unknown as RawBenefit)
    .sort((a, b) => String(b.startsAt).localeCompare(String(a.startsAt)))[0];
  const startsAt = String(latest.startsAt);
  const endsAt = String(latest.endsAt);
  return {
    kind: normalizeBenefitKind(latest.kind),
    plan: String(latest.plan),
    durationDays: Number(latest.durationDays),
    startsAt,
    endsAt,
    expired: Date.parse(endsAt) <= Date.now(),
  };
}
