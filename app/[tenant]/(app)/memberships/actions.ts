"use server";

import { requireTenantContext } from "@/lib/core/tenancy/context";
import { revalidatePath } from "next/cache";
import { createTenantDb } from "@/lib/core/tenancy/db";
import { formatDateShort } from "@/lib/foundation/format";
import { moneyOutcome } from "@/lib/business/sales/money-error";
import { createMembershipWithCharge, renewMembershipWithCharge } from "@/lib/industry/gym/memberships-db";
import { getProduct, saveProduct } from "@/lib/business/catalog/products-db";
import { can } from "@/lib/core/auth/permissions";
import {
  bogotaEndOfDay,
  bogotaStartOfDay,
  computeMembershipStatus,
  plainFromInstant,
  typeMonths,
  typeLabel,
} from "@/lib/industry/gym/memberships";
import { addMonths, bogotaToday, parsePlainDate } from "@/lib/foundation/dates/plain-date";
import {
  validateMembership,
  validateRenewal,
  type MembershipFieldErrors,
  type MembershipFormValues,
  type RenewalFieldErrors,
} from "./validators";

import { createMembershipsDb } from "@/lib/industry/gym/memberships-repo";
export type MembershipFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: MembershipFieldErrors;
  values?: MembershipFormValues;
};

export type RenewalFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: RenewalFieldErrors;
};

const ACCESS_DENIED_MEMBERSHIP: MembershipFormState = {
  status: "error",
  message: "No tienes acceso a este negocio.",
};

const ACCESS_DENIED_RENEWAL: RenewalFormState = {
  status: "error",
  message: "No tienes acceso a este negocio.",
};

/** Vender o renovar una membresía es cobrar: el Asesor no maneja dinero (SEC-05). */
const NO_MONEY_ROLE = "Tu rol no puede vender ni renovar membresías. Pídeselo a recepción o administración.";

type TenantDb = ReturnType<typeof createTenantDb>;

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario.
 * Devuelve `null` cuando algo falla (el caller responde con mensaje genérico).
 */
async function actionContext(
  tenantSlug: string,
): Promise<(TenantDb & { tenantId: string; memberId: string; role: string }) | null> {
  const context = await requireTenantContext(tenantSlug, "/memberships");
  if (!context) {
    return null;
  }
  return Object.assign(context.tenantDb, {
    tenantId: context.tenantId,
    memberId: context.memberId,
    role: context.role,
  });
}

/** Revalida el módulo de membresías, Finanzas y el dashboard juntos. */
function revalidateMembershipViews(tenantSlug: string): void {
  revalidatePath(`/${tenantSlug}/memberships`);
  revalidatePath(`/${tenantSlug}/finance`);
  revalidatePath(`/${tenantSlug}`);
}

/**
 * Crea una membresía. La vigencia SIEMPRE la calcula el servidor:
 * `endDate = fin de día (Bogotá) de startDate + duración del plan` — el
 * valor del form es solo indicativo. Estado inicial calculado dinámicamente.
 * Opcionalmente registra el cobro inicial como pago `APPROVED` vinculado.
 */
export async function createMembershipAction(
  _prevState: MembershipFormState,
  formData: FormData,
): Promise<MembershipFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const tenantDb = await actionContext(tenantSlug);
  if (!tenantDb) {
    return ACCESS_DENIED_MEMBERSHIP;
  }
  if (!can(tenantDb.role, "money.handle")) {
    return { status: "error", message: NO_MONEY_ROLE };
  }

  const validation = validateMembership(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  const { customerId, type, startDate, price, provider, registerInitialPayment } =
    validation.values;

  // El cliente debe existir y pertenecer a este tenant.
  const customer = await tenantDb.customers.get(customerId);
  if (!customer) {
    return {
      status: "error",
      message: "El cliente seleccionado no fue encontrado en este negocio.",
      values: validation.values,
    };
  }

  const startPlain = parsePlainDate(startDate);
  if (!startPlain) {
    return {
      status: "error",
      errors: { startDate: "Fecha de inicio no válida." },
      values: validation.values,
    };
  }

  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
  const startInstant = bogotaStartOfDay(startPlain);
  const endPlain = addMonths(startPlain, typeMonths(type));
  const endInstant = bogotaEndOfDay(endPlain);
  const status = computeMembershipStatus(endInstant, now);

  const priceAmount = String(Number(price.replace(",", ".")));
  // La membresía y su cobro inicial (recibo consecutivo; en efectivo entra a
  // la caja abierta) pasan juntos o no pasan: lib/business/sales/money-service.ts.
  const created = await moneyOutcome(() =>
    createMembershipWithCharge(tenantDb.tenantId, tenantDb.memberId, {
      customerId,
      type,
      startDate: startInstant,
      endDate: endInstant,
      status,
      price: priceAmount,
      charge: registerInitialPayment ? { method: provider, description: `Membresía ${typeLabel(type)} — cobro inicial` } : null,
    }),
  );
  if (!created.ok) return { status: "error", message: created.message, values: validation.values };

  revalidateMembershipViews(tenantSlug);
  return { status: "ok" };
}

/**
 * Renueva una membresía por un período completo del mismo plan:
 * - Si está vencida: la nueva vigencia corre desde HOY.
 * - Si sigue vigente: se extiende desde su `endDate` actual (sin gap).
 * Recalcula `status` y, opcionalmente, registra el pago de renovación como
 * `APPROVED`. El historial de cobros es el de `Payment` (DATA-02).
 */
export async function renewMembershipAction(
  _prevState: RenewalFormState,
  formData: FormData,
): Promise<RenewalFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const tenantDb = await actionContext(tenantSlug);
  if (!tenantDb) {
    return ACCESS_DENIED_RENEWAL;
  }
  if (!can(tenantDb.role, "money.handle")) {
    return { status: "error", message: NO_MONEY_ROLE };
  }

  const validation = validateRenewal(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
    };
  }

  const { membershipId, provider, registerPayment } = validation.values;

  const membership = await createMembershipsDb(tenantDb.tenantId).get(membershipId);
  if (!membership) {
    return {
      status: "error",
      message: "La membresía no fue encontrada en este negocio.",
    };
  }

  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
  const months = typeMonths(membership.type);

  // Vencida → desde hoy; vigente → extiende desde su fin actual.
  const basePlain =
    membership.status === "expired"
      ? bogotaToday()
      : plainFromInstant(membership.endDate);
  const newEndPlain = addMonths(basePlain, months);
  const newEndInstant = bogotaEndOfDay(newEndPlain);
  const newStatus = computeMembershipStatus(newEndInstant, now);

  const priceAmount = String(membership.price);

  // Renovación y cobro, juntos o nada.
  const renewed = await moneyOutcome(() =>
    renewMembershipWithCharge(tenantDb.tenantId, tenantDb.memberId, {
      membershipId,
      customerId: membership.customerId,
      endDate: newEndInstant,
      status: newStatus,
      price: priceAmount,
      charge: registerPayment ? { method: provider, description: `Membresía ${typeLabel(membership.type)} — renovación` } : null,
    }),
  );
  if (!renewed.ok) return { status: "error", message: renewed.message };

  revalidateMembershipViews(tenantSlug);
  return {
    status: "ok",
    message: `Renovada hasta ${formatDateShort(newEndInstant)}.`,
  };
}

// ---------------------------------------------------------------------------
// Tipos de membresía (planes del catálogo)
// ---------------------------------------------------------------------------

export type MembershipTypeInput = {
  name: string;
  price: number | null;
  durationDays: number | null;
  active: boolean;
};

export type MembershipTypeResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; errors?: Partial<Record<keyof MembershipTypeInput, string>> };

/**
 * Crea o edita un tipo de membresía (plan del catálogo con duración).
 * No inscribe a nadie ni cobra: eso se hace desde la ficha del cliente.
 */
export async function saveMembershipTypeAction(
  tenantSlug: string,
  id: string | null,
  input: MembershipTypeInput,
): Promise<MembershipTypeResult> {
  const ctx = await requireTenantContext(tenantSlug, "/memberships");
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  if (!can(ctx.role, "business.manage")) {
    return { ok: false, message: "Solo el dueño o administración edita los tipos de membresía." };
  }

  const errors: Partial<Record<keyof MembershipTypeInput, string>> = {};
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) errors.name = "Escribe el nombre (2 a 120 caracteres).";
  if (input.price == null || !Number.isFinite(input.price) || input.price <= 0) {
    errors.price = "El precio debe ser mayor que cero.";
  } else if (input.price > 100_000_000) {
    errors.price = "El precio no puede superar $100.000.000.";
  }
  if (input.durationDays == null || !Number.isInteger(input.durationDays) || input.durationDays < 1 || input.durationDays > 3650) {
    errors.durationDays = "La duración debe estar entre 1 y 3650 días.";
  }
  if (Object.keys(errors).length) return { ok: false, message: "Revisa los campos marcados.", errors };

  if (id) {
    const current = await getProduct(ctx.tenantId, id);
    if (!current || current.kind !== "PLAN") return { ok: false, message: "El tipo de membresía no existe en este negocio." };
  }

  await saveProduct(
    ctx.tenantId,
    id,
    {
      kind: "PLAN",
      name: name.slice(0, 120),
      description: null,
      sku: null,
      category: "Membresía",
      price: input.price!,
      cost: null,
      trackStock: false,
      minStock: 0,
      unit: null,
      durationMinutes: null,
      durationDays: input.durationDays!,
      capacity: null,
      active: input.active,
    },
    ctx.memberId,
  );

  revalidatePath(`/${tenantSlug}/memberships`);
  revalidatePath(`/${tenantSlug}/crm`);
  revalidatePath(`/${tenantSlug}/inventory`);
  revalidatePath(`/${tenantSlug}`);
  return { ok: true, message: id ? "Tipo de membresía guardado" : "Tipo de membresía creado" };
}
