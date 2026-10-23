import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { PageHeader } from "@/components/molecules/page-header";
import { StatTile } from "@/components/molecules/stat-tile";
import { UrlSegmentedControl } from "@/components/molecules/url-segmented-control";
import { addDaysKey } from "@/lib/business/calendar";
import { slotLoads, visitorReport, weekdayOf, WEEKDAYS } from "@/lib/business/museum";
import { getMuseumSettings, salesBetween, salesOn, ticketTypes } from "@/lib/business/museum-db";
import { canHandleCash, canManage } from "@/lib/business/roles";
import { bogotaDayKey } from "@/lib/finance/series";
import { formatCurrency } from "@/lib/format";
import { requireTenantContext } from "@/lib/tenant/context";
import { customerOptions } from "@/lib/business/customers-db";
import TicketDesk from "./_components/ticket-desk";
import VisitorReportView from "./_components/visitor-report";
import MuseumSettingsForm from "./_components/museum-settings-form";

const TABS = [
  { value: "venta", label: "Taquilla" },
  { value: "informe", label: "Informe de visitantes" },
  { value: "ajustes", label: "Aforo y horarios" },
] as const;
type Tab = (typeof TABS)[number]["value"];
const RANGES = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
] as const;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Taquilla del museo: venta de entradas por fecha y franja con aforo, reservas
 * de grupos, colegios y visitas guiadas (que pasan a la agenda), informe de
 * visitantes y ajustes de aforo y horarios.
 */
export default async function TicketsPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { tenant: slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, "/tickets");
  if (!ctx) notFound();

  const today = bogotaDayKey(new Date());
  const tabRaw = first(sp.tab);
  const tab: Tab = TABS.some((t) => t.value === tabRaw) ? (tabRaw as Tab) : "venta";
  const dayRaw = first(sp.day);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(dayRaw) ? dayRaw : today;
  const rangeRaw = first(sp.range);
  const range = RANGES.some((r) => r.value === rangeRaw) ? rangeRaw : "30";

  const settings = await getMuseumSettings(ctx.tenantId);
  const header = <PageHeader eyebrow="Museo" title="Taquilla" description="Entradas por franja con aforo, grupos, colegios y visitas guiadas." actions={<UrlSegmentedControl param="tab" value={tab} options={TABS} ariaLabel="Sección de taquilla" defaultValue="venta" />} />;

  if (tab === "ajustes") {
    const types = await ticketTypes(ctx.tenantId);
    return (
      <div className="space-y-6">
        {header}
        <MuseumSettingsForm slug={slug} settings={settings} canManage={canManage(ctx.role)} ticketTypes={types} />
      </div>
    );
  }

  if (tab === "informe") {
    const days = Array.from({ length: Number(range) }, (_, i) => addDaysKey(today, i - Number(range) + 1));
    const report = visitorReport(await salesBetween(ctx.tenantId, days[0], addDaysKey(today, 1)), days);
    return (
      <div className="space-y-6">
        {header}
        <UrlSegmentedControl param="range" value={range} options={RANGES} ariaLabel="Periodo del informe" defaultValue="30" className="print:hidden" />
        <VisitorReportView report={report} from={days[0]} to={today} />
      </div>
    );
  }

  const [sales, types, customers] = await Promise.all([
    salesOn(ctx.tenantId, day),
    ticketTypes(ctx.tenantId),
    customerOptions(ctx.tenantId, 500),
  ]);
  const loads = slotLoads(settings, sales);
  const valid = sales.filter((s) => s.status !== "VOID");
  const visitors = valid.reduce((a, s) => a + s.visitors, 0);
  const reserved = valid.filter((s) => s.status === "RESERVED").reduce((a, s) => a + s.visitors, 0);
  const revenue = valid.filter((s) => s.status === "PAID").reduce((a, s) => a + s.total, 0);
  const capacity = settings.capacityPerSlot * settings.slots.length;
  const closed = settings.closedWeekdays.includes(weekdayOf(day));
  const dayLabel = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

  return (
    <div className="space-y-6">
      {header}
      <nav aria-label="Día" className="flex flex-wrap items-center gap-2">
        <Link href={`?day=${addDaysKey(day, -1)}`} aria-label="Día anterior" className={buttonVariants({ size: "icon-sm", variant: "outline" })}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
        <p className="min-w-44 text-center font-display text-base font-semibold first-letter:uppercase">{dayLabel}</p>
        <Link href={`?day=${addDaysKey(day, 1)}`} aria-label="Día siguiente" className={buttonVariants({ size: "icon-sm", variant: "outline" })}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
        {day !== today ? (
          <Link href="?" className={buttonVariants({ size: "sm", variant: "ghost" })}>
            Hoy
          </Link>
        ) : null}
      </nav>

      <section aria-label="Resumen del día" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} label="Visitantes" value={visitors} tone="success" note={closed ? `Cerrado los ${WEEKDAYS[weekdayOf(day)].toLowerCase()}` : `Aforo del día: ${capacity}`} />
        <StatTile index={1} label="Reservados" value={reserved} tone={reserved ? "warning" : "muted"} note="Grupos y colegios por cobrar" />
        <StatTile index={2} label="Ventas" value={valid.length} tone="neutral" note={`${sales.length - valid.length} anuladas`} />
        <StatTile index={3} label="Recaudo" value={formatCurrency(revenue)} tone="neutral" note="Entradas cobradas" />
      </section>

      <TicketDesk slug={slug} day={day} isPast={day < today} closed={closed} loads={loads} sales={sales} types={types} customers={customers} canSell={canHandleCash(ctx.role)} canManage={canManage(ctx.role)} />
    </div>
  );
}
