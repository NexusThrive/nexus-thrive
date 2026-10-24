import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { addDaysKey, bogotaToMs, monthGrid, weekStart } from "@/lib/business/calendar";
import { listProducts } from "@/lib/business/products-db";
import { todayBogota } from "@/lib/ops/leads";
import { requireTenantContext } from "@/lib/tenant/context";
import { getVerticalTerms } from "@/lib/vertical-terms";
import { activeTeam, bookingsBetween, customerPhoneOptions, customersByIds } from "@/lib/business/bookings-db";
import AgendaCalendar from "./_agenda/agenda-calendar";
import type { AgendaBooking } from "./_agenda/types";
import { routeCategory } from "@/lib/navigation/tenant-nav";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Agenda del negocio como calendario (Mes / Semana / Día). Carga solo el
 * periodo visible (?v=&d=) y lo que necesita el formulario: clientes,
 * servicios del catálogo y el equipo.
 */
export default async function BookingsPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ v?: string; d?: string }> }) {
  const { tenant } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(tenant, "/bookings");
  if (!ctx) notFound();
  const today = todayBogota();
  const view = sp.v === "week" || sp.v === "day" ? sp.v : "month";
  const cursor = sp.d && DATE.test(sp.d) ? sp.d : today;
  const [y, m] = cursor.split("-").map(Number);
  const grid = monthGrid(y, m).flat();
  const from = view === "month" ? grid[0].day : view === "week" ? weekStart(cursor) : cursor;
  const to = view === "month" ? addDaysKey(grid[grid.length - 1].day, 1) : view === "week" ? addDaysKey(weekStart(cursor), 7) : addDaysKey(cursor, 1);

  const [rows, customers, services, team] = await Promise.all([
    bookingsBetween(ctx.tenantId, bogotaToMs(from, "00:00"), bogotaToMs(to, "00:00")),
    customerPhoneOptions(ctx.tenantId),
    listProducts(ctx.tenantId, { kind: ["SERVICE", "TOUR", "TICKET"], activeOnly: true }),
    activeTeam(ctx.tenantId),
  ]);
  const tenantRow = ctx.tenant;
  const custById = new Map(customers.map((c) => [c.id, c]));
  const missing = rows.map((r) => r.customerId).filter((id) => !custById.has(id));
  if (missing.length) {
    const extra = await customersByIds(ctx.tenantId, missing);
    for (const c of extra) custById.set(c.id, c);
  }
  const staffName = new Map(team.map((u) => [u.id, u.name ?? u.email]));
  const bookings: AgendaBooking[] = rows.map((b) => ({
    id: b.id,
    customerId: b.customerId,
    customerName: custById.get(b.customerId)?.name ?? "Cliente eliminado",
    customerPhone: custById.get(b.customerId)?.phone ?? null,
    serviceName: b.serviceName,
    productId: b.productId,
    staffUserId: b.staffUserId,
    staffName: b.staffUserId ? (staffName.get(b.staffUserId) ?? null) : null,
    start: Date.parse(String(b.startDate)),
    end: Date.parse(String(b.endDate)),
    status: b.status as AgendaBooking["status"],
    partySize: b.partySize,
    amount: Number(b.totalAmount),
    notes: b.notes,
    reminderSent: !!b.reminderSentAt,
  }));
  const terms = getVerticalTerms(tenantRow?.vertical ?? ctx.vertical);
  return (
    <div className="grid gap-5">
      <PageHeader eyebrow={routeCategory("/bookings")} title={terms.bookings} description="Toca un día o una hora para agendar. Los colores muestran qué días están llenos." />
      <AgendaCalendar
        slug={tenant}
        business={tenantRow?.name ?? ""}
        view={view}
        cursor={cursor}
        today={today}
        bookings={bookings}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        services={services.map((s) => ({ id: s.id, name: s.name, price: s.price, durationMinutes: s.durationMinutes, capacity: s.capacity }))}
        staff={team.map((u) => ({ id: u.id, name: u.name ?? u.email }))}
        dailyCapacity={8}
      />
    </div>
  );
}
