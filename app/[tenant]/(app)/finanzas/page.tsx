import { notFound, redirect } from "next/navigation";
import { loadActiveTenant } from "@/lib/core/tenancy/context";
import { createTenantDb } from "@/lib/core/tenancy/db";
import FinanceActions from "./_components/finance-actions";
import SearchInput from "@/components/molecules/search-input";
import FilterSelect from "@/components/molecules/filter-select";
import MoneyList from "./_components/money-list";
import type { MoneyItem } from "./_components/money-detail-sheet";
import { listCashBoxes } from "@/lib/business/sales/finance-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { EXPENSE_CATEGORIES } from "@/lib/foundation/kernel/payment-vocabulary";
import { PageHeader } from "@/components/molecules/page-header";
import { UrlSegmentedControl } from "@/components/molecules/url-segmented-control";
import FinanceOverview from "./_components/finance-overview";

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

  // Cobros y Caja menor tienen su propia página (con su lugar en el menú); los enlaces viejos con ?tab= siguen funcionando.
  const oldTab = firstString(sp.tab);
  if (oldTab === "cobros" || oldTab === "caja") {
    const rest = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (k !== "tab" && v !== undefined) rest.set(k, firstString(v));
    redirect(`/${tenantSlug}/finanzas/${oldTab === "caja" ? "caja" : "cobros"}${rest.size ? `?${rest}` : ""}`);
  }

  // --- Filtros de gastos (prefijo `g`) --------------------------------
  const gq = firstString(sp.gq).trim();
  const gcat = firstString(sp.gcat) || undefined;
  const gpage = firstNumber(sp.gpage);

  // --- Periodo de la tarjeta de balance (7 o 30 días) ------------------
  const period = firstString(sp.p) === "7d" ? 7 : 30;
  const nuevo = firstString(sp.nuevo);
  const initialSheet = nuevo === "pago" || nuevo === "gasto" ? nuevo : firstString(sp.scan) === "1" ? "escaneo" : null;
  const initialCustomerId = firstString(sp.cliente);

  const tenantRecord = await loadActiveTenant(tenantSlug);
  if (!tenantRecord) {
    notFound();
  }

  // La membresía y el permiso se comprueban antes de leer cualquier dato del negocio.
  const pageCtx = await requireTenantContext(tenantSlug, "/finanzas");
  if (!pageCtx) notFound();

  const tenantDb = createTenantDb(tenantRecord.id);

  const [metrics, series, movements, expenseResult, activeCustomers] =
    await Promise.all([
      tenantDb.finance.getMetrics(),
      tenantDb.finance.getSeries(period),
      tenantDb.finance.getMovements(30),
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

  const expenseTotalPages = Math.max(
    1,
    Math.ceil(expenseResult.total / PAGE_SIZE),
  );
  const safeExpensePage = Math.min(gpage, expenseTotalPages);

  const customerOptions = activeCustomers.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? null,
  }));

  const periodLabel = period === 7 ? "últimos 7 días" : "últimos 30 días";

  const tab = (["resumen", "gastos"] as const).find((t) => t === firstString(sp.tab)) ?? "resumen";
  const cashBoxes = await listCashBoxes(tenantRecord.id);
  const openBox = cashBoxes.find((b) => b.openSession) ?? null;
  const business = { name: tenantRecord.name, subtitle: tenantRecord.city ?? undefined };
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
    <div data-bleed="" className="grid gap-5 px-6 pb-8 pt-6" suppressHydrationWarning>
      <PageHeader
        title="Finanzas"
        description={<>Resumen y gastos de{" "}
          <span className="font-medium text-foreground/80">{tenantRecord.name}</span>.</>}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
          <UrlSegmentedControl
            param="tab"
            ariaLabel="Secciones de finanzas"
            value={tab}
            defaultValue="resumen"
            options={[
              { value: "resumen", label: "Resumen" },
              { value: "gastos", label: "Gastos", count: expenseResult.total },
            ]}
            className="w-full [&>button]:min-w-0 [&>button]:flex-1 sm:w-auto sm:[&>button]:flex-none"
          />
        </div>
        {tab === "resumen" ? (
          <UrlSegmentedControl
            param="p"
            ariaLabel="Periodo"
            value={period === 7 ? "7d" : "30d"}
            defaultValue="30d"
            options={[
              { value: "7d", label: "7 días" },
              { value: "30d", label: "30 días" },
            ]}
            className="w-full [&>button]:flex-1 sm:w-auto sm:[&>button]:flex-none"
          />
        ) : null}
      </div>

      {tab === "resumen" ? (
        <FinanceOverview
          slug={tenantSlug}
          periodLabel={periodLabel}
          series={series}
          byMethod={metrics.byMethod}
          monthLabel={monthLabel}
          movements={movements}
          cash={{ box: openBox?.name ?? cashBoxes[0]?.name ?? null, amount: openBox?.openSession ? openBox.openSession.expected : null }}
        />
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
            emptyAction={gq ? undefined : { label: "Registrar gasto", quick: "expense" }}
            empty={gq ? { title: `Sin coincidencias para «${gq}»`, description: "Prueba con otro término." } : { title: "Aún no hay gastos", description: "Registra tus gastos con su soporte para saber en qué se va el dinero." }}
          />
        </section>
      ) : null}

    </div>
  );
}
