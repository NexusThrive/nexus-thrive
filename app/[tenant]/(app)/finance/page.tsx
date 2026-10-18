import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import FinanceActions from "./_components/finance-actions";
import SearchInput from "@/components/molecules/search-input";
import FilterSelect from "@/components/molecules/filter-select";
import MoneyList from "./_components/money-list";
import type { MoneyItem } from "./_components/money-detail-sheet";
import CashPanel from "./_components/cash-panel";
import { cashHistory, listCashBoxes, sessionMovements } from "@/lib/business/finance-db";
import { canManage } from "@/lib/business/roles";
import { requireTenantContext } from "@/lib/tenant-context";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/finance";
import { PageHeader } from "@/components/molecules/page-header";
import { UrlSegmentedControl } from "@/components/molecules/url-segmented-control";
import { BalanceCard } from "@/components/organisms/balance-card";
import { MovementsList } from "@/components/organisms/movements-list";
import PettyCashCard from "./_components/petty-cash-card";

const PAGE_SIZE = 10;

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function firstNumber(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(firstString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Finanzas y caja menor. La URL es la fuente de verdad de los filtros de
 * ambas secciones: pagos con prefijo `p` (pq/pmethod/pstatus/ppage) y gastos
 * con prefijo `g` (gq/gcat/gpage). El acceso (tenant activo + miembro) está
 * garantizado por el layout de `app/[tenant]/layout.tsx`.
 *
 * Los montos llegan como `number` (COP) y las fechas como ISO strings; la
 * UI solo recibe filas serializables ya tipadas.
 */
export default async function FinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;

  // --- Filtros de pagos (prefijo `p`) -------------------------------
  const pq = firstString(sp.pq).trim();
  const pmethodRaw = firstString(sp.pmethod);
  const pmethod = PAYMENT_METHODS.some((option) => option.value === pmethodRaw)
    ? (pmethodRaw as (typeof PAYMENT_METHODS)[number]["value"])
    : undefined;
  const pstatusRaw = firstString(sp.pstatus);
  const pstatus = PAYMENT_STATUSES.some((option) => option.value === pstatusRaw)
    ? (pstatusRaw as (typeof PAYMENT_STATUSES)[number]["value"])
    : undefined;
  const ppage = firstNumber(sp.ppage);

  // --- Filtros de gastos (prefijo `g`) --------------------------------
  const gq = firstString(sp.gq).trim();
  const gcat = firstString(sp.gcat) || undefined;
  const gpage = firstNumber(sp.gpage);

  // --- Periodo de la tarjeta de balance (7 o 30 días) ------------------
  const period = firstString(sp.p) === "7d" ? 7 : 30;
  const nuevo = firstString(sp.nuevo);
  const initialSheet = nuevo === "pago" || nuevo === "gasto" ? nuevo : null;
  const initialCustomerId = firstString(sp.cliente);

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    notFound();
  }

  const tenantDb = createTenantDb(tenantRecord.id);

  const [metrics, series, movements, paymentResult, expenseResult, activeCustomers] =
    await Promise.all([
      tenantDb.finance.getMetrics(),
      tenantDb.finance.getSeries(period),
      tenantDb.finance.getMovements(30),
      tenantDb.finance.listPayments({
        q: pq,
        method: pmethod,
        status: pstatus,
        page: ppage,
        limit: PAGE_SIZE,
      }),
      tenantDb.finance.listExpenses({
        q: gq,
        category: gcat,
        page: gpage,
        limit: PAGE_SIZE,
      }),
      tenantDb.customers.search({ status: "active", pageSize: 200 }),
    ]);

  const monthLabel = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date());

  const paymentTotalPages = Math.max(
    1,
    Math.ceil(paymentResult.total / PAGE_SIZE),
  );
  const expenseTotalPages = Math.max(
    1,
    Math.ceil(expenseResult.total / PAGE_SIZE),
  );
  const safePaymentPage = Math.min(ppage, paymentTotalPages);
  const safeExpensePage = Math.min(gpage, expenseTotalPages);

  const customerOptions = activeCustomers.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? null,
  }));

  const periodLabel = period === 7 ? "últimos 7 días" : "últimos 30 días";

  const tab = (["resumen", "cobros", "gastos", "caja"] as const).find((t) => t === firstString(sp.tab)) ?? "resumen";
  const [cashBoxes, cashHist, members, ctx] = await Promise.all([
    listCashBoxes(tenantRecord.id),
    tab === "caja" ? cashHistory(tenantRecord.id, 10) : Promise.resolve([]),
    db.orm.public.User.where({ tenantId: tenantRecord.id }).select("id", "name", "email").all(),
    requireTenantContext(tenantSlug),
  ]);
  const openBox = cashBoxes.find((b) => b.openSession) ?? null;
  const cashMoves = tab === "caja" && openBox?.openSession ? await sessionMovements(tenantRecord.id, openBox.openSession.id) : [];
  const business = { name: tenantRecord.name, subtitle: tenantRecord.city ?? undefined };
  const paymentItems: MoneyItem[] = paymentResult.rows.map((r) => ({
    kind: "PAYMENT",
    id: r.id,
    amount: r.amount,
    // Sin cliente registrado: el concepto dice qué se vendió o a quién se cobró.
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
  const expenseItems: MoneyItem[] = expenseResult.rows.map((r) => ({
    kind: "EXPENSE",
    id: r.id,
    amount: r.amount,
    title: r.description,
    concept: r.description,
    category: r.category,
    supplier: r.supplier,
    paidFrom: r.paidFrom,
    date: r.date,
    voided: r.voided,
    voidReason: r.voidReason,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Gestión"
        title="Finanzas"
        description={<>Cobros, gastos y caja menor de{" "}
          <span className="font-medium text-foreground/80">{tenantRecord.name}</span>.</>}
        actions={
          <div className="flex flex-wrap gap-2">
            <FinanceActions
              tenantSlug={tenantSlug}
              business={business}
              customers={customerOptions}
              initial={initialSheet}
              initialCustomerId={initialCustomerId}
              tone="light"
              cashOpen={!!openBox}
            />
          </div>
        }
      />

      <div className="overflow-x-auto [scrollbar-width:none]">
        <UrlSegmentedControl
          param="tab"
          ariaLabel="Secciones de finanzas"
          value={tab}
          defaultValue="resumen"
          options={[
            { value: "resumen", label: "Resumen" },
            { value: "cobros", label: "Cobros", count: paymentResult.total },
            { value: "gastos", label: "Gastos", count: expenseResult.total },
            { value: "caja", label: openBox ? "Caja menor · abierta" : "Caja menor" },
          ]}
        />
      </div>

      {tab === "resumen" ? (
        <div className="grid gap-3.5">
          <div className="flex justify-end">
            <UrlSegmentedControl
              param="p"
              ariaLabel="Periodo"
              value={period === 7 ? "7d" : "30d"}
              defaultValue="30d"
              options={[
                { value: "7d", label: "7 días" },
                { value: "30d", label: "30 días" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <BalanceCard label={`Balance · ${periodLabel}`} balance={series.current.balance} income={series.current.income} expenses={series.current.expenses} />
            <PettyCashCard
              spent={series.current.expenses}
              income={series.current.income}
              periodLabel={periodLabel}
              byMethod={metrics.byMethod}
              monthLabel={monthLabel}
              cash={openBox?.openSession ? { box: openBox.name, amount: openBox.openSession.expected, href: `/${tenantSlug}/finance?tab=caja` } : { box: cashBoxes[0]?.name ?? null, amount: null, href: `/${tenantSlug}/finance?tab=caja` }}
            />
          </div>
          <MovementsList items={movements} />
        </div>
      ) : null}

      {tab === "cobros" ? (
        <section aria-label="Cobros" className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <SearchInput paramKey="pq" pageParam="ppage" ariaLabel="Buscar pagos" placeholder="Buscar por cliente, recibo o concepto…" defaultValue={pq} />
            <FilterSelect paramKey="pmethod" pageParam="ppage" allLabel="Todos los métodos" options={PAYMENT_METHODS} value={pmethod ?? ""} />
            <FilterSelect paramKey="pstatus" pageParam="ppage" allLabel="Todos los estados" options={PAYMENT_STATUSES} value={pstatus ?? ""} />
          </div>
          <MoneyList
            slug={tenantSlug}
            items={paymentItems}
            business={business}
            page={safePaymentPage}
            totalPages={paymentTotalPages}
            pageParam="ppage"
            totalLabel={`${paymentResult.total} ${paymentResult.total === 1 ? "cobro" : "cobros"}`}
            empty={pq ? { title: `Sin coincidencias para «${pq}»`, description: "Prueba con otro término o limpia los filtros." } : { title: "Aún no hay cobros", description: "Registra tu primer cobro con «Registrar pago»." }}
          />
        </section>
      ) : null}

      {tab === "gastos" ? (
        <section aria-label="Gastos" className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <SearchInput paramKey="gq" pageParam="gpage" ariaLabel="Buscar gastos" placeholder="Buscar por descripción o proveedor…" defaultValue={gq} />
            <FilterSelect paramKey="gcat" pageParam="gpage" allLabel="Todas las categorías" options={EXPENSE_CATEGORIES.map((value) => ({ value, label: value }))} value={gcat ?? ""} />
          </div>
          <MoneyList
            slug={tenantSlug}
            items={expenseItems}
            business={business}
            page={safeExpensePage}
            totalPages={expenseTotalPages}
            pageParam="gpage"
            totalLabel={`${expenseResult.total} ${expenseResult.total === 1 ? "gasto" : "gastos"}`}
            empty={gq ? { title: `Sin coincidencias para «${gq}»`, description: "Prueba con otro término." } : { title: "Aún no hay gastos", description: "Registra tus gastos con su soporte para saber en qué se va el dinero." }}
          />
        </section>
      ) : null}

      {tab === "caja" ? (
        <CashPanel
          slug={tenantSlug}
          boxes={cashBoxes}
          moves={cashMoves}
          history={cashHist}
          members={members.map((m) => ({ id: m.id, name: m.name ?? m.email }))}
          canManage={!!ctx && canManage(ctx.role)}
        />
      ) : null}
    </div>
  );
}
