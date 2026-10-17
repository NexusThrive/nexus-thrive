"use server";

import { parseCopAmount } from "@/lib/cop-amount";
import { requireTenantContext as requireSharedTenantContext } from "@/lib/tenant-context";
import { revalidatePath } from "next/cache";
import { createTenantDb } from "@/lib/tenant-db";

type TenantDb = ReturnType<typeof createTenantDb>;

export type BookingFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: {
    customerId?: string;
    serviceName?: string;
    startDate?: string;
    endDate?: string;
    totalAmount?: string;
    notes?: string;
  };
};

export type BookingStatusFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: {
    bookingId?: string;
    status?: string;
  };
};

/** Estados que un usuario puede asignar manualmente desde la UI. */
const UPDATABLE_STATUSES = ["CONFIRMED", "CANCELLED", "COMPLETED"] as const;
type UpdatableStatus = (typeof UPDATABLE_STATUSES)[number];

const ACCESS_DENIED_BOOKINGS: BookingFormState = {
  status: "error",
  message: "No tienes acceso a este negocio.",
};

const ACCESS_DENIED_BOOKING_STATUS: BookingStatusFormState = {
  status: "error",
  message: "No tienes acceso a este negocio.",
};

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario y devuelve
 * el contexto de datos acotado al tenant. `null` cuando falla el acceso.
 *
 * El `tenantId` SIEMPRE sale del servidor (slug de la ruta + sesión); nunca
 * se confía en identificadores enviados por el cliente.
 */
async function requireTenantDb(
  tenantSlug: string,
): Promise<{ tenantDb: TenantDb; tenantId: string } | null> {
  const context = await requireSharedTenantContext(tenantSlug);
  if (!context) {
    return null;
  }
  return { tenantDb: context.tenantDb, tenantId: context.tenantId };
}

/**
 * Normaliza un importe en COP (ver `parseCopAmount`: "50000", "50.000",
 * "50,000", "1.234.567,89"). Devuelve `null` si no es un número positivo.
 */
function parseAmount(raw: string): number | null {
  const amount = parseCopAmount(raw);
  return amount === null ? null : Number(amount);
}

/**
 * Convierte "YYYY-MM-DD" (input type=date) a un `Temporal.Instant` a las
 * 00:00 en horario Bogotá (UTC−5 → 05:00 UTC). Prisma 8 exige `Temporal.Instant`
 * en los campos timestamp-temporal. Devuelve `null` si no es una fecha válida.
 */
function toBogotaStartInstant(isoDay: string): Temporal.Instant | null {
  const parts = isoDay.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) {
    return null;
  }
  const [year, month, day] = parts;
  const ms = Date.UTC(year, month - 1, day, 5, 0, 0);
  return Number.isNaN(ms)
    ? null
    : Temporal.Instant.fromEpochMilliseconds(ms);
}

/**
 * Crea una reserva para el tenant activo. Valida la entrada, comprueba que el
 * cliente pertenezca al tenant y persiste con `tenantDb` (tenantId asignado
 * en el servidor).
 */
export async function createBookingAction(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await requireTenantDb(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_BOOKINGS;
  }

  const { tenantDb } = context;

  const customerId = String(formData.get("customerId") ?? "").trim();
  const serviceName = String(formData.get("serviceName") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "");
  const endDateRaw = String(formData.get("endDate") ?? "");
  const totalAmountRaw = String(formData.get("totalAmount") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  const errors: BookingFormState["errors"] = {};

  if (!customerId) {
    errors.customerId = "Selecciona un cliente.";
  }
  if (!serviceName) {
    errors.serviceName = "El nombre del servicio es requerido.";
  }

  const start = startDateRaw ? toBogotaStartInstant(startDateRaw) : null;
  const end = endDateRaw ? toBogotaStartInstant(endDateRaw) : null;

  if (!startDateRaw) {
    errors.startDate = "La fecha de inicio es requerida.";
  } else if (!start) {
    errors.startDate = "Fecha de inicio no válida.";
  }
  if (!endDateRaw) {
    errors.endDate = "La fecha de fin es requerida.";
  } else if (!end) {
    errors.endDate = "Fecha de fin no válida.";
  }
  if (
    start &&
    end &&
    end.epochMilliseconds < start.epochMilliseconds
  ) {
    errors.endDate = "La fecha de fin no puede ser anterior a la de inicio.";
  }

  const amount = parseAmount(totalAmountRaw);
  if (amount === null) {
    errors.totalAmount = "El importe debe ser un número positivo.";
  }

  // Puerto de salida único de validación: si hay errores (o falta un valor
  // crítico) se responde; `start`, `end` y `amount` quedan no nulos tras él.
  if (
    Object.keys(errors).length > 0 ||
    !start ||
    !end ||
    amount === null
  ) {
    return { status: "error", errors };
  }

  try {
    // El cliente debe pertenecer al tenant activo (consulta acotada).
    const customer = await tenantDb.customers.get(customerId);
    if (!customer) {
      return {
        status: "error",
        errors: { customerId: "El cliente seleccionado no pertenece a este negocio." },
      };
    }

    const now = Temporal.Instant.fromEpochMilliseconds(Date.now());

    await tenantDb.bookings.create({
      customerId,
      serviceName,
      startDate: start,
      endDate: end,
      status: "PENDING",
      totalAmount: BigInt(Math.round(amount)),
      notes,
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath(`/${tenantSlug}/bookings`);

    return { status: "ok", message: "Reserva creada correctamente." };
  } catch (error) {
    console.error("Error creating booking:", error);
    return {
      status: "error",
      message: "Error al crear la reserva. Inténtalo de nuevo.",
    };
  }
}

/**
 * Actualiza el estado de una reserva existente (CONFIRMED / CANCELLED /
 * COMPLETED). Verifica que la reserva pertenezca al tenant activo antes de
 * modificarla: no se puede tocar una reserva de otro negocio cambiando el id.
 */
export async function updateBookingStatusAction(
  _prevState: BookingStatusFormState,
  formData: FormData,
): Promise<BookingStatusFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  const context = await requireTenantDb(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_BOOKING_STATUS;
  }

  const { tenantDb } = context;

  const errors: BookingStatusFormState["errors"] = {};

  if (!bookingId) {
    errors.bookingId = "El ID de la reserva es requerido.";
  }
  if (!(UPDATABLE_STATUSES as readonly string[]).includes(status)) {
    errors.status = "Estado no válido. Debe ser CONFIRMED, CANCELLED o COMPLETED.";
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  try {
    // Consulta acotada al tenant: `get` filtra por id + tenantId.
    const booking = await tenantDb.bookings.get(bookingId);
    if (!booking) {
      return {
        status: "error",
        errors: { bookingId: "La reserva no fue encontrada en este negocio." },
      };
    }

    await tenantDb.bookings.update(bookingId, { status: status as UpdatableStatus });

    revalidatePath(`/${tenantSlug}/bookings`);

    return {
      status: "ok",
      message: "Estado de la reserva actualizado correctamente.",
    };
  } catch (error) {
    console.error("Error updating booking status:", error);
    return {
      status: "error",
      message: "Error al actualizar la reserva. Inténtalo de nuevo.",
    };
  }
}
