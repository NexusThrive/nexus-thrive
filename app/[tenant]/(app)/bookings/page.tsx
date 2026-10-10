import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { formatCurrency, formatDate } from "@/lib/format";
import BookingsView, {
  type BookingCustomerOption,
  type BookingMetrics,
  type BookingStatusValue,
  type BookingView,
} from "./_components/bookings-view";

/**
 * Módulo de Reservas (Server Component).
 *
 * El acceso (sesión, tenant activo y membresía) ya lo garantiza
 * `app/[tenant]/layout.tsx`. Aquí se resuelve el tenant y se cargan los datos
 * reales —KPIs, reservas con nombre de cliente y clientes para el formulario—
 * todo acotado por `tenantId`. La interacción (crear/actualizar) vive en los
 * componentes cliente y sus Server Actions.
 */
export default async function BookingsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();

  if (!tenantRecord) {
    notFound();
  }

  const tenantId = tenantRecord.id;
  const tenantDb = createTenantDb(tenantId);

  const [totalResult, confirmedResult, pendingResult, bookingRows, customerResult] =
    await Promise.all([
      db.orm.public.Booking
        .where({ tenantId })
        .aggregate((aggregate) => ({ total: aggregate.count() })),
      db.orm.public.Booking
        .where({ tenantId, status: "CONFIRMED" })
        .aggregate((aggregate) => ({ total: aggregate.count() })),
      db.orm.public.Booking
        .where({ tenantId, status: "PENDING" })
        .aggregate((aggregate) => ({ total: aggregate.count() })),
      db.orm.public.Booking
        .where({ tenantId })
        .select(
          "id",
          "customerId",
          "serviceName",
          "startDate",
          "endDate",
          "status",
          "totalAmount",
          "notes",
        )
        .orderBy((booking) => booking.createdAt.desc())
        .all(),
      tenantDb.customers.search({ status: "active", pageSize: 200 }),
    ]);

  // Nombres de cliente en un solo mapa (evita una consulta por reserva).
  const customerNames = new Map(
    customerResult.rows.map((customer) => [customer.id, customer.name]),
  );

  const bookings: BookingView[] = bookingRows.map((booking) => ({
    id: booking.id,
    customerName: customerNames.get(booking.customerId) ?? "Cliente eliminado",
    serviceName: booking.serviceName,
    startDateLabel: formatDate(booking.startDate),
    endDateLabel: formatDate(booking.endDate),
    status: booking.status as BookingStatusValue,
    amountLabel: formatCurrency(Number(booking.totalAmount)),
    notes: booking.notes ?? null,
  }));

  const customers: BookingCustomerOption[] = customerResult.rows.map(
    (customer) => ({
      id: customer.id,
      name: customer.name,
    }),
  );

  const metrics: BookingMetrics = {
    total: Number(totalResult.total),
    confirmed: Number(confirmedResult.total),
    pending: Number(pendingResult.total),
  };

  return (
    <BookingsView
      tenantSlug={tenantRecord.slug}
      metrics={metrics}
      bookings={bookings}
      customers={customers}
    />
  );
}
