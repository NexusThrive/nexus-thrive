import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import FinanceActions from "./_components/finance-actions";
import SearchInput from "@/components/molecules/search-input";
import FilterSelect from "@/components/molecules/filter-select";
import PaymentsTable, { type PaymentViewRow } from "./_components/payments-table";
import ExpensesTable, { type ExpenseViewRow } from "./_components/expenses-table";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/finance";
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

  const paymentRows: PaymentViewRow[] = paymentResult.rows.map((row) => ({
    id: row.id,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    amount: row.amount,
    provider: row.provider,
    status: row.status,
    description: row.description,
    createdAt: row.createdAt,
  }));

  const expenseRows: ExpenseViewRow[] = expenseResult.rows.map((row) => ({
    id: row.id,
    category: row.category,
    description: row.description,
    amount: row.amount,
    date: row.date,
  }));

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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Gestión"
        title="Finanzas"
        description={<>Ingresos, gastos y caja menor de{" "}
          <span className="font-medium text-foreground/80">{tenantRecord.name}</span>.</>}
        actions={
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
        }
      />

      <div>
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <BalanceCard
            label={`Balance · ${periodLabel}`}
            balance={series.current.balance}
            income={series.current.income}
            expenses={series.current.expenses}
            actions={
              <FinanceActions
                tenantSlug={tenantSlug}
                business={{ name: tenantRecord.name, subtitle: tenantRecord.city ?? undefined }}
                customers={customerOptions}
                initial={initialSheet}
                initialCustomerId={initialCustomerId}
              />
            }
          />
          <PettyCashCard
            spent={series.current.expenses}
            income={series.current.income}
            periodLabel={periodLabel}
            byMethod={metrics.byMethod}
            monthLabel={monthLabel}
          />
        </div>

        <MovementsList items={movements} />
      </div>

      <h2 className="border-t border-border pt-6 font-display text-[17px] font-semibold">Detalle</h2>

      {/* ---------- Cobros (pagos) ---------- */}
      <section aria-labelledby="payments-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="payments-title"
              className="text-base font-semibold text-foreground"
            >
              Cobros
            </h2>
            <p className="text-sm text-muted-foreground">
              {paymentResult.total}{" "}
              {paymentResult.total === 1 ? "pago registrado" : "pagos registrados"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <SearchInput
            paramKey="pq"
            pageParam="ppage"
            ariaLabel="Buscar pagos"
            placeholder="Buscar por referencia o descripción…"
            defaultValue={pq}
          />
          <FilterSelect
            paramKey="pmethod"
            pageParam="ppage"
            allLabel="Todos los métodos"
            options={PAYMENT_METHODS}
            value={pmethod ?? ""}
          />
          <FilterSelect
            paramKey="pstatus"
            pageParam="ppage"
            allLabel="Todos los estados"
            options={PAYMENT_STATUSES}
            value={pstatus ?? ""}
          />
        </div>

        <PaymentsTable
          rows={paymentRows}
          query={pq}
          page={safePaymentPage}
          totalPages={paymentTotalPages}
        />
      </section>

      {/* ---------- Gastos de caja menor ---------- */}
      <section aria-labelledby="expenses-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="expenses-title"
              className="text-base font-semibold text-foreground"
            >
              Gastos de caja menor
            </h2>
            <p className="text-sm text-muted-foreground">
              {expenseResult.total}{" "}
              {expenseResult.total === 1 ? "gasto registrado" : "gastos registrados"}
            </p>
          </div>
          {/* El botón de gasto vive dentro de FinanceActions (mismo row). */}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <SearchInput
            paramKey="gq"
            pageParam="gpage"
            ariaLabel="Buscar gastos"
            placeholder="Buscar por descripción…"
            defaultValue={gq}
          />
          <FilterSelect
            paramKey="gcat"
            pageParam="gpage"
            allLabel="Todas las categorías"
            options={[
              "Servicios",
              "Nómina",
              "Insumos",
              "Arriendo",
              "Otros",
            ].map((value) => ({ value, label: value }))}
            value={gcat ?? ""}
          />
        </div>

        <ExpensesTable
          rows={expenseRows}
          query={gq}
          page={safeExpensePage}
          totalPages={expenseTotalPages}
        />
      </section>
    </div>
  );
}