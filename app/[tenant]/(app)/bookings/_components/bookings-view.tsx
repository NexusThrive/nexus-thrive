"use client";

import { useEffect, useState, useActionState, startTransition } from "react";
import { CalendarPlus, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { NLoader } from "@/components/atoms/n-loader";
import { useToast } from "@/components/molecules/toast";
import { StatTile } from "@/components/molecules/stat-tile";
import {
  createBookingAction,
  updateBookingStatusAction,
  type BookingFormState,
  type BookingStatusFormState,
} from "../actions";
import { buttonVariants } from "@/components/atoms/button-variants";
import { PageHeader } from "@/components/molecules/page-header";

export type BookingStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type BookingView = {
  id: string;
  customerName: string;
  serviceName: string;
  startDateLabel: string;
  endDateLabel: string;
  status: BookingStatusValue;
  amountLabel: string;
  notes: string | null;
};

export type BookingCustomerOption = { id: string; name: string };
export type BookingMetrics = { total: number; confirmed: number; pending: number };

const CREATE_IDLE: BookingFormState = { status: "idle" };
const STATUS_IDLE: BookingStatusFormState = { status: "idle" };

const STATUS_LABELS: Record<BookingStatusValue, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const STATUS_BADGE: Record<BookingStatusValue, string> = {
  PENDING: "bg-warning/15 text-warning-foreground",
  CONFIRMED: "bg-success/15 text-success",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/10 text-destructive",
};

const EMPTY_FORM = {
  customerId: "",
  serviceName: "",
  startDate: "",
  endDate: "",
  totalAmount: "",
  notes: "",
};

function fieldClass(hasError: boolean) {
  return cn(
    "h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
    hasError
      ? "border-destructive focus:border-destructive focus:outline-destructive/30"
      : "border-border hover:border-ring/50 focus:border-ring focus:outline-ring/30",
  );
}

export default function BookingsView(props: {
  tenantSlug: string;
  metrics: BookingMetrics;
  bookings: BookingView[];
  customers: BookingCustomerOption[];
}) {
  return <BookingsContent {...props} />;
}

function BookingsContent({
  tenantSlug,
  metrics,
  bookings,
  customers,
}: {
  tenantSlug: string;
  metrics: BookingMetrics;
  bookings: BookingView[];
  customers: BookingCustomerOption[];
}) {
  const { toast } = useToast();

  const [createState, createFormAction, isCreatePending] = useActionState(
    createBookingAction,
    CREATE_IDLE,
  );
  const [statusState, statusFormAction, isStatusPending] = useActionState(
    updateBookingStatusAction,
    STATUS_IDLE,
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Notificaciones toast: useEffect para no llamar setState del provider durante render.
  const [prevCreateState, setPrevCreateState] = useState<BookingFormState>(CREATE_IDLE);
  const [prevStatusState, setPrevStatusState] = useState<BookingStatusFormState>(STATUS_IDLE);

  // Render-phase: actualiza estado local y trackea cambios previos
  if (prevCreateState !== createState) {
    setPrevCreateState(createState);
    if (createState.status === "ok") {
      setForm(EMPTY_FORM);
      setShowForm(false);
    }
  }

  if (prevStatusState !== statusState) {
    setPrevStatusState(statusState);
  }

  // useEffect para toast (sistema externo) - permitido por react-hooks/set-state-in-effect
  useEffect(() => {
    if (createState.status === "ok") {
      toast(createState.message ?? "Reserva creada correctamente.", "success");
    } else if (createState.status === "error" && createState.message) {
      toast(createState.message, "error");
    }
  }, [createState, toast]);

  useEffect(() => {
    if (statusState.status === "ok") {
      toast(statusState.message ?? "Reserva actualizada.", "success");
    } else if (
      statusState.status === "error" &&
      (statusState.message || statusState.errors?.bookingId)
    ) {
      toast(statusState.message ?? statusState.errors?.bookingId ?? "Error.", "error");
    }
  }, [statusState, toast]);

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleStatus = (bookingId: string, status: BookingStatusValue) => {
    if (isStatusPending) {
      return;
    }
    const formData = new FormData();
    formData.append("tenantSlug", tenantSlug);
    formData.append("bookingId", bookingId);
    formData.append("status", status);
    startTransition(() => {
      statusFormAction(formData);
    });
  };

  const errors = createState.errors ?? {};
  const noCustomers = customers.length === 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Gestión"
        title="Reservas"
        description="Gestiona las reservas y su estado."
        actions={<button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className={buttonVariants()}
        >
          {showForm ? (
            <X aria-hidden="true" className="h-4 w-4" />
          ) : (
            <CalendarPlus aria-hidden="true" className="h-4 w-4" />
          )}
          {showForm ? "Cerrar" : "Nueva reserva"}
        </button>}
      />

      {/* KPIs reales */}
      <section aria-label="Resumen de reservas" className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        <StatTile index={0} label="Reservas totales" value={metrics.total} tone="neutral" note="Todas las registradas" />
        <StatTile index={1} label="Confirmadas" value={metrics.confirmed} tone="success" note="Listas para atender" />
        <StatTile index={2} label="Pendientes" value={metrics.pending} tone="warning" pulse={metrics.pending > 0} note="Esperan confirmación" />
      </section>

      {showForm && (
        <form
          action={createFormAction}
          noValidate
          className="mb-6 rounded-lg border border-border bg-card p-6"
        >
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <h2 className="mb-4 font-semibold text-foreground">Nueva reserva</h2>

          {noCustomers && (
            <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
              Aún no tienes clientes activos. Crea uno en el módulo CRM para
              poder reservar.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="booking-customer" className="text-sm font-medium text-foreground/80">
                Cliente <span className="text-destructive">*</span>
              </label>
              <select
                id="booking-customer"
                name="customerId"
                value={form.customerId}
                onChange={(event) => setField("customerId", event.target.value)}
                aria-invalid={Boolean(errors.customerId)}
                className={cn("mt-1", fieldClass(Boolean(errors.customerId)))}
              >
                <option value="">Selecciona un cliente…</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors.customerId}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="booking-service" className="text-sm font-medium text-foreground/80">
                Servicio <span className="text-destructive">*</span>
              </label>
              <input
                id="booking-service"
                name="serviceName"
                value={form.serviceName}
                onChange={(event) => setField("serviceName", event.target.value)}
                aria-invalid={Boolean(errors.serviceName)}
                placeholder="Ej. Entrenamiento personal"
                className={cn("mt-1", fieldClass(Boolean(errors.serviceName)))}
              />
              {errors.serviceName && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors.serviceName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="booking-start" className="text-sm font-medium text-foreground/80">
                Fecha de inicio <span className="text-destructive">*</span>
              </label>
              <input
                id="booking-start"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={(event) => setField("startDate", event.target.value)}
                aria-invalid={Boolean(errors.startDate)}
                className={cn("mt-1", fieldClass(Boolean(errors.startDate)))}
              />
              {errors.startDate && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="booking-end" className="text-sm font-medium text-foreground/80">
                Fecha de fin <span className="text-destructive">*</span>
              </label>
              <input
                id="booking-end"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={(event) => setField("endDate", event.target.value)}
                aria-invalid={Boolean(errors.endDate)}
                className={cn("mt-1", fieldClass(Boolean(errors.endDate)))}
              />
              {errors.endDate && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors.endDate}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="booking-amount" className="text-sm font-medium text-foreground/80">
                Importe (COP) <span className="text-destructive">*</span>
              </label>
              <input
                id="booking-amount"
                name="totalAmount"
                inputMode="numeric"
                value={form.totalAmount}
                onChange={(event) => setField("totalAmount", event.target.value)}
                aria-invalid={Boolean(errors.totalAmount)}
                placeholder="Ej. 50000 o 50.000"
                className={cn("mt-1", fieldClass(Boolean(errors.totalAmount)))}
              />
              {errors.totalAmount && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors.totalAmount}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="booking-notes" className="text-sm font-medium text-foreground/80">
                Notas
              </label>
              <input
                id="booking-notes"
                name="notes"
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Observaciones (opcional)"
                className={cn("mt-1", fieldClass(false))}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={isCreatePending}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreatePending || noCustomers}
              className={buttonVariants()}
            >
              {isCreatePending && <NLoader size={16} className="text-current" />}
              {isCreatePending ? "Creando…" : "Crear reserva"}
            </button>
          </div>
        </form>
      )}

      {bookings.length === 0 ? (
        <p className="rounded-lg border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          Aún no tienes reservas. Crea la primera con “Nueva reserva”.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-strong text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Servicio</th>
                <th className="px-4 py-3 font-medium">Fechas</th>
                <th className="px-4 py-3 text-right font-medium">Importe</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {booking.customerName}
                  </td>
                  <td className="px-4 py-3 text-foreground/80">
                    {booking.serviceName}
                    {booking.notes && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {booking.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span>{booking.startDateLabel}</span>
                    <span className="mx-1 text-border">→</span>
                    <span>{booking.endDateLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {booking.amountLabel}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-block rounded px-2 py-1 text-xs font-medium",
                        STATUS_BADGE[booking.status],
                      )}
                    >
                      {STATUS_LABELS[booking.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      {booking.status === "PENDING" && (
                        <button
                          type="button"
                          disabled={isStatusPending}
                          onClick={() => handleStatus(booking.id, "CONFIRMED")}
                          className="text-xs font-medium text-success underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                      )}
                      {(booking.status === "PENDING" ||
                        booking.status === "CONFIRMED") && (
                        <>
                          <button
                            type="button"
                            disabled={isStatusPending}
                            onClick={() => handleStatus(booking.id, "COMPLETED")}
                            className="text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
                          >
                            Completar
                          </button>
                          <button
                            type="button"
                            disabled={isStatusPending}
                            onClick={() => handleStatus(booking.id, "CANCELLED")}
                            className="text-xs font-medium text-destructive underline-offset-2 hover:underline disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      {(booking.status === "COMPLETED" ||
                        booking.status === "CANCELLED") && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

