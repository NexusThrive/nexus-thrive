import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import FinanceSummary from "./_components/finance-summary";
import FinanceActions from "./_components/finance-actions";
import SearchInput from "@/components/molecules/search-input";
import FilterSelect from "@/components/molecules/filter-select";
import PaymentsTable, { type PaymentViewRow } from "./_components/payments-table";
import ExpensesTable, { type ExpenseViewRow } from "./_components/expenses-table";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/finance";

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

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    notFound();
  }

  const tenantDb = createTenantDb(tenantRecord.id);

  const [metrics, paymentResult, expenseResult, activeCustomers] =
    await Promise.all([
      tenantDb.finance.getMetrics(),
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
  }));

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[clamp(24px,4.4vw,34px)] font-bold leading-[1.12] tracking-[-0.02em] text-foreground">
          Finanzas y caja menor
        </h1>
        <p className="text-sm text-muted-foreground">
          Cobros y gastos de{" "}
          <span className="font-medium text-foreground/80">{tenantRecord.name}</span>{" "}
          · {monthLabel}.
        </p>
      </header>

      {/* Resumen del mes */}
      <FinanceSummary
        income={metrics.income}
        expenses={metrics.expenses}
        balance={metrics.balance}
        byMethod={metrics.byMethod}
      />

      {/* ---------- Cobros (pagos) ---------- */}
      <section aria-labelledby="payments-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="payments-title"
              className="text-base font-semibold text-foreground"
            >
              Cobros (pagos)
            </h2>
            <p className="text-sm text-muted-foreground">
              {paymentResult.total}{" "}
              {paymentResult.total === 1 ? "pago registrado" : "pagos registrados"}
            </p>
          </div>
          <FinanceActions tenantSlug={tenantSlug} customers={customerOptions} />
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