import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FilterSelect from "@/components/molecules/filter-select";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import SearchInput from "@/components/molecules/search-input";
import { can } from "@/lib/core/auth/permissions";
import { requireTenantContext, loadActiveTenant } from "@/lib/core/tenancy/context";
import { createTenantDb } from "@/lib/core/tenancy/db";
import { listCashBoxes } from "@/lib/business/sales/finance-db";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/foundation/kernel/payment-vocabulary";
import FinanceActions from "../_components/finance-actions";
import MoneyList from "../_components/money-list";
import type { MoneyItem } from "../_components/money-detail-sheet";

export const metadata: Metadata = { title: "Cobros" };

const PAGE_SIZE = 10;
const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

/** Cobros: pagos recibidos con su búsqueda y filtros (la URL es la fuente de verdad: `pq`, `pmethod`, `pstatus`, `ppage`). */
export default async function CobrosPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { tenant } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(tenant, "/finanzas/cobros");
  if (!ctx) notFound();
  const header = <PageHeader title="Cobros" description="Los pagos que recibes: por cliente, medio y estado." />;
  if (!can(ctx.role, "money.handle")) {
    return (
      <div data-bleed="" className="grid gap-5 px-6 pb-8 pt-6">
        {header}
        <PermissionNotice permission="money.handle" action="ver los cobros" />
      </div>
    );
  }
  const tenantRecord = await loadActiveTenant(tenant);
  if (!tenantRecord) notFound();

  const pq = first(sp.pq).trim();
  const pmethodRaw = first(sp.pmethod);
  const pmethod = PAYMENT_METHODS.some((o) => o.value === pmethodRaw) ? (pmethodRaw as (typeof PAYMENT_METHODS)[number]["value"]) : undefined;
  const pstatusRaw = first(sp.pstatus);
  const pstatus = PAYMENT_STATUSES.some((o) => o.value === pstatusRaw) ? (pstatusRaw as (typeof PAYMENT_STATUSES)[number]["value"]) : undefined;
  const parsed = Number.parseInt(first(sp.ppage), 10);
  const ppage = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const nuevo = first(sp.nuevo);
  const initialSheet = nuevo === "pago" || nuevo === "gasto" ? nuevo : first(sp.scan) === "1" ? "escaneo" : null;

  const tenantDb = createTenantDb(tenantRecord.id);
  const [result, activeCustomers, boxes] = await Promise.all([
    tenantDb.finance.listPayments({ q: pq, method: pmethod, status: pstatus, page: ppage, limit: PAGE_SIZE }),
    tenantDb.customers.search({ status: "active", pageSize: 200 }),
    listCashBoxes(tenantRecord.id),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const business = { name: tenantRecord.name, subtitle: tenantRecord.city ?? undefined };
  const items: MoneyItem[] = result.rows.map((r) => ({
    kind: "PAYMENT",
    id: r.id,
    amount: r.amount,
    title: r.customerName ?? r.description ?? "Venta de mostrador",
    concept: r.description ?? "Pago de servicio",
    method: r.provider,
    status: r.status,
    receiptNumber: r.receiptNumber,
    date: r.createdAt,
    phone: r.customerPhone,
    voidReason: r.voidReason,
    notes: r.notes,
  }));
  return (
    <div data-bleed="" className="grid gap-5 px-6 pb-8 pt-6" suppressHydrationWarning>
      <PageHeader
        title="Cobros"
        description="Los pagos que recibes: por cliente, medio y estado."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <FinanceActions tenantSlug={tenant} business={business} customers={activeCustomers.rows.map((r) => ({ id: r.id, name: r.name, email: r.email ?? "", phone: r.phone ?? null }))} initial={initialSheet} initialCustomerId={first(sp.cliente)} tone="light" cashOpen={boxes.some((b) => b.openSession)} />
          </div>
        }
      />
      <section aria-label="Cobros" className="grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <SearchInput paramKey="pq" pageParam="ppage" ariaLabel="Buscar pagos" placeholder="Buscar por cliente, recibo o concepto…" defaultValue={pq} />
          <FilterSelect paramKey="pmethod" pageParam="ppage" allLabel="Todos los métodos" options={PAYMENT_METHODS} value={pmethod ?? ""} />
          <FilterSelect paramKey="pstatus" pageParam="ppage" allLabel="Todos los estados" options={PAYMENT_STATUSES} value={pstatus ?? ""} />
        </div>
        <MoneyList
          slug={tenant}
          items={items}
          business={business}
          page={Math.min(ppage, totalPages)}
          totalPages={totalPages}
          pageParam="ppage"
          totalLabel={`${result.total} ${result.total === 1 ? "cobro" : "cobros"}`}
          emptyAction={pq ? undefined : { label: "Registrar pago", quick: "payment" }}
          empty={pq ? { title: `Sin coincidencias para «${pq}»`, description: "Prueba con otro término o limpia los filtros." } : { title: "Aún no hay cobros", description: "Registra tu primer cobro con «Registrar pago»." }}
        />
      </section>
    </div>
  );
}
