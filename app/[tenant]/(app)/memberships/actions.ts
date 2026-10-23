"use server";

import { requireTenantContext as requireSharedTenantContext } from "@/lib/tenant/context";
import { revalidatePath } from "next/cache";
import { createTenantDb } from "@/lib/tenant/db";
import { formatDateShort } from "@/lib/format";
import { recordCharge } from "@/lib/business/charge";
import { moneyTransaction } from "@/lib/business/money-service";
import { can } from "@/lib/business/permissions";
import {
  addMonths,
  bogotaEndOfDay,
  bogotaStartOfDay,
  bogotaToday,
  computeMembershipStatus,
  parsePlainDate,
  plainFromInstant,
  typeMonths,
  typeLabel,
} from "@/lib/business/memberships";
import {
  validateMembership,
  validateRenewal,
  type MembershipFieldErrors,
  type MembershipFormValues,
  type RenewalFieldErrors,
} from "./validators";

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
async function requireTenantDb(
  tenantSlug: string,
): Promise<(TenantDb & { tenantId: string; memberId: string; role: string }) | null> {
  const context = await requireSharedTenantContext(tenantSlug);
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
  const tenantDb = await requireTenantDb(tenantSlug);
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
  // la caja abierta) pasan juntos o no pasan: lib/business/money-service.ts.
  await moneyTransaction(async (tx) => {
    const membership = await tx.orm.public.Membership.create({
      tenantId: tenantDb.tenantId,
      customerId,
      type,
      startDate: startInstant,
      endDate: endInstant,
      status,
      price: priceAmount,
    });
    if (registerInitialPayment) {
      await recordCharge(
        tenantDb.tenantId,
        {
          customerId,
          membershipId: membership.id,
          method: provider,
          amount: Number(priceAmount),
          description: `Membresía ${typeLabel(type)} — cobro inicial`,
          sourceType: "MEMBERSHIP",
          sourceId: membership.id,
        },
        tenantDb.memberId,
        tx,
      );
    }
  });

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
  const tenantDb = await requireTenantDb(tenantSlug);
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

  const membership = await tenantDb.memberships.get(membershipId);
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
  await moneyTransaction(async (tx) => {
    await tx.orm.public.Membership.where({ id: membershipId, tenantId: tenantDb.tenantId }).update({
      endDate: newEndInstant,
      status: newStatus,
    });
    if (registerPayment) {
      await recordCharge(
        tenantDb.tenantId,
        {
          customerId: membership.customerId,
          membershipId,
          method: provider,
          amount: Number(priceAmount),
          description: `Membresía ${typeLabel(membership.type)} — renovación`,
          sourceType: "MEMBERSHIP",
          sourceId: membershipId,
        },
        tenantDb.memberId,
        tx,
      );
    }
  });

  revalidateMembershipViews(tenantSlug);
  return {
    status: "ok",
    message: `Renovada hasta ${formatDateShort(newEndInstant)}.`,
  };
}
