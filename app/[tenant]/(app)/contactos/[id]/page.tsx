import { groupIdsOfCustomers, listCustomerGroups } from "@/lib/business/customers/customer-search-db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { commercialTimeline, mergeTimeline } from "@/lib/business/growth/commercial-timeline";
import { customerFicha, customerNeighbors } from "@/lib/business/customers/customer-ficha-db";
import { customerOpportunityCount } from "@/lib/business/growth/pipeline-read";
import { customerFormValues } from "@/lib/business/customers/new-customer-db";
import { COUNTRIES, DOCUMENT_TYPES, type NewCustomerInput } from "@/lib/business/customers/new-customer";
import { tenantWithModules } from "@/lib/core/tenancy/membership";
import { buildCustomer360, createTenantDb } from "@/lib/core/tenancy/db";
import { getCustomer360Memberships } from "@/lib/industry/gym/memberships-repo";
import { typeLabel } from "@/lib/industry/gym/memberships";
import { getVerticalTerms } from "@/lib/core/sectors/terms";
import { isRouteEnabled, requirePageContext } from "@/lib/core/tenancy/context";
import { can } from "@/lib/core/auth/permissions";
import { formatCurrency } from "@/lib/foundation/format";
import { paymentStatusLabel } from "@/lib/foundation/kernel/payment-vocabulary";
import NewCustomerForm from "../nuevo/_components/new-customer-form";
import FichaView, { type FichaRow, type FichaTab } from "./_components/ficha/ficha-view";
import type { ActivityItem } from "./_components/ficha/ficha-activity";
import NotesPanel from "./_components/notes-panel";
import PurchasesPanel from "./_components/purchases-panel";
import AssignMembership from "./_components/assign-membership";
import { customerPurchases } from "@/lib/business/customers/purchases-db";

export const metadata: Metadata = { title: "Ficha del cliente" };

const TAB_KEYS: FichaTab[] = ["citas", "ventas", "productos", "facturas", "membresias", "relacionados", "notas"];
const BOOKING_STATUS: Record<string, { label: string; tone: "pending" | "ok" | "muted" }> = {
  PENDING: { label: "Pendiente", tone: "pending" },
  CONFIRMED: { label: "Confirmada", tone: "ok" },
  COMPLETED: { label: "Atendida", tone: "muted" },
  CANCELLED: { label: "Cancelada", tone: "muted" },
};
const INVOICE_STATUS: Record<string, { label: string; tone: "pending" | "ok" | "muted" }> = {
  ISSUED: { label: "Por cobrar", tone: "pending" },
  PAID: { label: "Pagada", tone: "ok" },
  VOID: { label: "Anulada", tone: "muted" },
};
const shortDate = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" });
const fmtDate = (iso: string) => shortDate.format(new Date(iso)).replace(".", "").replace(/ de /g, " ");
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * FICHA DEL CLIENTE — modo lectura de la misma pantalla de Nuevo cliente. Server Component: todo se carga aquí y verifica que el cliente
 * es de ESTE negocio (`get360Base` y `customerFicha` filtran por `tenantId`). `?editar=1` abre el formulario precargado; `?tab=` elige la
 * pestaña del historial; `q`, `status` y `sort` son los de la lista de origen (para volver y para el paginador).
 */
export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const sp = await searchParams;
  const pageCtx = await requirePageContext(tenantSlug, "/contactos");
  const tenantRecord = await tenantWithModules(pageCtx.tenantId);
  if (!tenantRecord) notFound();
  const terms = getVerticalTerms(tenantRecord.vertical);
  // ?editar=1 abre el formulario de cliente precargado; ?campo= pone el foco en ese dato (enlaces «Añadir»).
  if (sp.editar === "1") {
    const initial = await customerFormValues(pageCtx.tenantId, id);
    if (!initial) notFound();
    const campo = typeof sp.campo === "string" && sp.campo in initial ? (sp.campo as keyof NewCustomerInput) : undefined;
    return (
      <NewCustomerForm
        slug={tenantSlug}
        customersLabel={terms.customers}
        canBook={await isRouteEnabled(pageCtx.tenantId, "/bookings")}
        editId={id}
        initial={initial}
        customerName={initial.name}
        focusField={campo}
      />
    );
  }
  const tenantDb = createTenantDb(tenantRecord.id);
  const [base, gym, ficha, commercial, canBook, canSell, canTasks, canCrm] = await Promise.all([
    tenantDb.customers.get360Base(id),
    getCustomer360Memberships(tenantRecord.id, id),
    customerFicha(tenantRecord.id, id),
    commercialTimeline(tenantRecord.id, id),
    isRouteEnabled(pageCtx.tenantId, "/bookings"),
    isRouteEnabled(pageCtx.tenantId, "/ventas/cotizaciones"),
    isRouteEnabled(pageCtx.tenantId, "/crm/tareas"),
    isRouteEnabled(pageCtx.tenantId, "/crm"),
  ]);
  const opportunities = canCrm ? await customerOpportunityCount(tenantRecord.id, id) : null;
  if (!base || !ficha) notFound();
  const { customer, payments, notes } = buildCustomer360(base, [gym.contribution]);
  const { memberships } = gym;

  // Lista de origen: misma búsqueda, filtro y orden (para volver y para el paginador).
  const list = {
    q: first(sp.q).trim() || undefined,
    status: first(sp.status) === "archived" ? ("archived" as const) : undefined,
    sort: (["name_asc", "name_desc"] as const).find((v) => v === first(sp.sort)),
  };
  const listParams = Object.fromEntries(Object.entries(list).filter(([, v]) => v)) as Record<string, string>;
  const listQs = new URLSearchParams(listParams).toString();
  const listHref = `/${tenantSlug}/contactos${listQs ? `?${listQs}` : ""}`;
  const hrefFor = (extra: Record<string, string>, target = id) => {
    const qs = new URLSearchParams({ ...listParams, ...extra }).toString();
    return `/${tenantSlug}/contactos/${target}${qs ? `?${qs}` : ""}`;
  };
  const tabRaw = first(sp.tab) as FichaTab;
  const tab: FichaTab = TAB_KEYS.includes(tabRaw) ? tabRaw : "citas";
  const neighbors = await customerNeighbors(tenantRecord.id, id, list);
  const tabParam: Record<string, string> = tab !== "citas" ? { tab } : {};
  const pager = neighbors
    ? {
        index: neighbors.index,
        total: neighbors.total,
        prevHref: neighbors.prev ? hrefFor(tabParam, neighbors.prev) : null,
        nextHref: neighbors.next ? hrefFor(tabParam, neighbors.next) : null,
      }
    : null;

  const bookHref = canBook ? `/${tenantSlug}/bookings?nuevo=1&cliente=${id}` : null;
  const saleHref = canSell ? `/${tenantSlug}/ventas/cotizaciones?nuevo=1&cliente=${id}` : null;
  const activeMembership = memberships.find((m) => m.status !== "expired") ?? null;
  // «Asignar membresía» (ya vinculado a este cliente) para el estado vacío de Membresías, solo con el módulo activo.
  const membershipAction = (await isRouteEnabled(pageCtx.tenantId, "/memberships")) ? (
    <AssignMembership tenantSlug={tenantSlug} customerId={customer.id} customerName={customer.name} hasActive={Boolean(activeMembership)} canCharge={can(pageCtx.role, "money.handle")} className="h-11 rounded-full px-6 text-sm font-semibold" />
  ) : null;
  const sales = payments.filter((p) => p.status === "APPROVED");

  // Pestaña activa: filas, contenido propio o estado vacío.
  let rows: FichaRow[] = [];
  if (tab === "citas") {
    rows = ficha.bookings.map((b) => ({ id: b.id, date: fmtDate(b.start), title: b.title, status: BOOKING_STATUS[b.status] }));
  } else if (tab === "ventas") {
    rows = payments.slice(0, 50).map((p) => ({
      id: p.id,
      date: fmtDate(p.createdAt),
      title: p.description || "Pago",
      amount: formatCurrency(p.amount),
      status: { label: paymentStatusLabel(p.status), tone: p.status === "APPROVED" ? "ok" : p.status === "PENDING" ? "pending" : "muted" },
    }));
  } else if (tab === "facturas") {
    rows = ficha.invoices.map((i) => ({ id: i.id, date: fmtDate(i.issueDate), title: `Factura ${i.number}`, amount: formatCurrency(i.total), status: INVOICE_STATUS[i.status] }));
  } else if (tab === "membresias") {
    rows = memberships.map((m) => ({
      id: m.id,
      date: fmtDate(m.startDate),
      title: `${typeLabel(m.type)} · hasta ${fmtDate(m.endDate)}`,
      amount: formatCurrency(m.price),
      status: m.status === "expired" ? { label: "Vencida", tone: "muted" } : m.status === "expiring" ? { label: "Por vencer", tone: "pending" } : { label: "Activa", tone: "ok" },
    }));
  }

  // Actividad: alta, citas, ventas y pagos, notas, documentos y archivos, de lo más nuevo a lo más viejo.
  const now = new Date();
  const timeline = mergeTimeline(buildCustomer360(base, [gym.contribution]).timeline, commercial);
  const authorOf = new Map(notes.map((n) => [`note-${n.id}`, n.authorName]));
  const activity: ActivityItem[] = [
    ...timeline.map((e) => ({ id: e.id, date: e.date, text: e.amount ? `${e.title} · ${formatCurrency(e.amount)}` : e.type === "note" && e.description ? `Nota: ${e.description}` : e.title, author: authorOf.get(e.id) ?? null })),
    ...ficha.bookings.map((b) => ({ id: `bk-${b.id}`, date: b.start, text: `Cita agendada: ${b.title}`, author: null })),
    ...ficha.files.map((f) => ({ id: `file-${f.id}`, date: f.createdAt, text: `Archivo adjuntado: ${f.name}`, author: null })),
    { id: "created", date: ficha.createdAt, text: "Cliente creado", author: null },
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 80)
    .map((e) => ({ ...e, fresh: now.getTime() - new Date(e.date).getTime() < 86_400_000 }));

  const documentLabel = DOCUMENT_TYPES.find((d) => d.value === ficha.documentType)?.label ?? null;
  const country = COUNTRIES.find((c) => c.value === ficha.country)?.label ?? ficha.country;
  const location = [ficha.city, ficha.region].filter(Boolean).join(", ") || null;

  const [allGroups, memberOf] = await Promise.all([listCustomerGroups(tenantRecord.id), groupIdsOfCustomers(tenantRecord.id, [id])]);
  const groupById = new Map(allGroups.map((g) => [g.id, { id: g.id, name: g.name, icon: g.icon }]));

  return (
    <FichaView
      slug={tenantSlug}
      groupOptions={allGroups}
      customer={{
        id: customer.id,
        name: customer.name,
        active: customer.active,
        kind: ficha.kind,
        phone: customer.phone,
        email: customer.email,
        address: ficha.address,
        tags: ficha.tags,
        groups: (memberOf.get(id) ?? []).flatMap((gid) => (groupById.has(gid) ? [groupById.get(gid)!] : [])),
        photoUrl: ficha.photoId ? `/api/files/${ficha.photoId}` : null,
      }}
      customersLabel={terms.customers}
      listHref={listHref}
      hrefFor={(extra) => hrefFor(extra)}
      canRemove={can(pageCtx.role, "customers.delete")}
      bookHref={bookHref}
      saleHref={saleHref}
      activityHref={canTasks ? `/${tenantSlug}/crm/tareas?nuevo=1&cliente=${id}` : null}
      crmHref={canCrm ? `/${tenantSlug}/crm?cliente=${id}&mios=0` : null}
      pager={pager}
      summary={{
        bookings: ficha.bookingsCount,
        sales: sales.length,
        plan: activeMembership ? typeLabel(activeMembership.type) : null,
        owed: formatCurrency(ficha.owed),
        invoiced: formatCurrency(ficha.invoicedTotal),
        opportunities,
      }}
      data={[
        { label: "Tipo de documento", value: ficha.documentNumber ? documentLabel : null, empty: "Sin registrar", field: "documentType" },
        { label: "Número de documento", value: ficha.documentNumber, empty: "Sin registrar", field: "documentNumber" },
        { label: "Ciudad", value: location, empty: "Sin registrar", field: "city" },
        { label: "País", value: country, empty: "Sin registrar", field: "country" },
        { label: "¿Cómo nos conoció?", value: ficha.source, empty: "Sin especificar", field: "source" },
        { label: "Registrado", value: fmtDate(ficha.createdAt), empty: "Sin registrar" },
      ]}
      tab={tab}
      rows={rows}
      tabContent={tab === "notas" ? <NotesPanel tenantSlug={tenantSlug} customerId={customer.id} customerName={customer.name} initialNotes={notes} /> : tab === "productos" ? <PurchasesPanel purchases={await customerPurchases(tenantRecord.id, customer.id)} saleHref={saleHref} /> : undefined}
      membershipAction={membershipAction}
      activity={activity}
      now={now.toISOString()}
    />
  );
}
