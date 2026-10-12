import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  CheckCircle2,
  FileText,
  FolderKanban,
  Plus,
  Upload,
  Wallet,
} from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { canGovernBudget, type TenantRole } from "@/lib/tenant-context";
import { getQuoteTerms } from "@/lib/vertical-terms";
import { formatCurrency } from "@/lib/format";
import {
  QUOTE_STATUSES,
  isValidCategory,
  isValidStatus,
  type QuoteStatusValue,
} from "@/lib/apu-engine";
import { cn } from "@/lib/cn";
import SearchInput from "@/app/components/tenant/search-input";
import FilterSelect from "@/app/components/tenant/filter-select";
import QuotesWorkspace, { type QuotesTab } from "./_components/quotes-workspace";
import QuotesTable from "./_components/quotes-table";
import ItemsBank from "./_components/items-bank";
import ActivityCatalog from "./_components/activity-catalog";

const QUOTES_PAGE_SIZE = 10;
const ITEMS_PAGE_SIZE = 10;

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function card(
  icon: React.ReactNode,
  title: string,
  value: string,
  description: string,
  tone: string,
) {
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
            tone,
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
        {description}
      </p>
    </article>
  );
}

/**
 * Módulo Construcción & APU: la URL es la fuente de verdad
 * (`?tab=&bq=&bs=&aq=&iq=&ic=`). Cada Server Action llama `revalidatePath`.
 *
 * El acceso (tenant activo + miembro) está garantizado por el layout de
 * `app/[tenant]/layout.tsx`.
 */
export default async function QuotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;

  const tag = firstString(sp.tab);
  const activeTab: QuotesTab =
    tag === "activities" || tag === "items" ? tag : "quotes";

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    notFound();
  }

  const tenantDb = createTenantDb(tenantRecord.id);
  const [metrics] = await Promise.all([tenantDb.quotes.getMetrics()]);

  // Rol del miembro actual: habilita las acciones destructivas del catálogo
  // (archivar/borrar) solo para OWNER/SUPERADMIN. La membresía ya está
  // garantizada por el layout del tenant.
  const { userId } = await auth();
  const member = userId
    ? await tenantDb.users.findByClerkUserId(userId)
    : null;
  const canManageCatalog = canGovernBudget(
    (member?.role ?? "STAFF") as TenantRole,
  );

  const terms = getQuoteTerms(tenantRecord.vertical);

  let quotesSection: React.ReactNode = null;
  let activitiesSection: React.ReactNode = null;
  let itemsSection: React.ReactNode = null;

  if (activeTab === "quotes") {
    const q = firstString(sp.bq).trim();
    const statusRaw = firstString(sp.bs);
    const status: QuoteStatusValue | undefined = isValidStatus(statusRaw)
      ? statusRaw
      : undefined;
    const pageRaw = Number.parseInt(firstString(sp.bpage), 10);
    const requestedPage = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    const result = await tenantDb.quotes.list({
      q,
      status,
      page: requestedPage,
      limit: QUOTES_PAGE_SIZE,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / QUOTES_PAGE_SIZE));
    const safePage = Math.min(requestedPage, totalPages);

    quotesSection = (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              paramKey="bq"
              pageParam="bpage"
              ariaLabel={`Buscar ${terms.quotes.toLowerCase()}`}
              placeholder={`Buscar ${terms.quote.toLowerCase()} o código…`}
              defaultValue={q}
            />
            <FilterSelect
              paramKey="bs"
              pageParam="bpage"
              allLabel={`Todos los estados`}
              options={QUOTE_STATUSES}
              value={status ?? ""}
            />
          </div>
          <Link
            href={`/${tenantSlug}/quotes/new`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nuevo {terms.quote.toLowerCase()}
          </Link>
        </div>
        <QuotesTable
          tenantSlug={tenantSlug}
          rows={result.rows}
          total={result.total}
          page={safePage}
          quoteLabel={terms.quote}
        />
      </div>
    );
  }

  if (activeTab === "activities") {
    const q = firstString(sp.aq).trim();
    const [catalog, itemsResult, p99] = await Promise.all([
      tenantDb.apu.listActivities({ q }),
      tenantDb.apu.listItems({ limit: 400 }),
      tenantDb.apu.getP99Thresholds(),
    ]);
    activitiesSection = (
      <ActivityCatalog
        tenantSlug={tenantSlug}
        rows={catalog.rows}
        items={itemsResult.rows}
        activityLabel={terms.apuActivity}
        p99Thresholds={p99}
      />
    );
  }

  if (activeTab === "items") {
    const q = firstString(sp.iq).trim();
    const categoryRaw = firstString(sp.ic);
    const category = isValidCategory(categoryRaw)
      ? categoryRaw
      : undefined;
    const activeRaw = firstString(sp.ia);
    const active =
      activeRaw === "active"
        ? true
        : activeRaw === "archived"
          ? false
          : undefined;
    const pageRaw = Number.parseInt(firstString(sp.ipage), 10);
    const requestedPage = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    const result = await tenantDb.apu.listItems({
      q,
      category,
      active,
      page: requestedPage,
      limit: ITEMS_PAGE_SIZE,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / ITEMS_PAGE_SIZE));
    const safePage = Math.min(requestedPage, totalPages);

    itemsSection = (
      <ItemsBank
        tenantSlug={tenantSlug}
        rows={result.rows}
        total={result.total}
        page={safePage}
        itemLabel={terms.apuItem}
        canManage={canManageCatalog}
        activeFilter={activeRaw}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {terms.quotes}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Presupuestos de obra, catálogo de análisis de precios unitarios y
            banco de insumos de{" "}
            <span className="font-medium text-foreground/80">{tenantRecord.name}</span>.
          </p>
        </div>
        <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0">
          <Link
            href={`/${tenantSlug}/quotes/projects`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground/80 transition hover:bg-muted"
          >
            <FolderKanban aria-hidden="true" className="h-4 w-4" />
            Proyectos de obra
          </Link>
          <Link
            href={`/${tenantSlug}/quotes/import`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-subtle px-3 text-sm font-medium text-accent-text transition hover:border-accent/40 hover:bg-accent-subtle"
          >
            <Upload aria-hidden="true" className="h-4 w-4" />
            Importar APU
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {card(
          <FileText aria-hidden="true" className="h-5 w-5 text-accent-text" />,
          `Total ${terms.quotes.toLowerCase()}`,
          String(metrics.total),
          "Creados en este negocio",
          "bg-accent-subtle text-accent-text",
        )}
        {card(
          <CheckCircle2
            aria-hidden="true"
            className="h-5 w-5 text-success"
          />,
          `${terms.quotes.toLowerCase()} aprobados`,
          String(metrics.approved),
          "Aprobados por el cliente",
          "bg-success/10 text-success",
        )}
        {card(
          <FileText aria-hidden="true" className="h-5 w-5 text-gold-700" />,
          `${terms.quotes.toLowerCase()} en borrador`,
          String(metrics.draft),
          "Pendientes de enviar",
          "bg-gold-100 text-gold-700",
        )}
        {card(
          <Wallet aria-hidden="true" className="h-5 w-5 text-muted-foreground" />,
          `Monto total cotizado`,
          formatCurrency(metrics.totalAmount),
          "Suma de todos los presupuestos",
          "bg-muted text-muted-foreground",
        )}
      </div>

      <QuotesWorkspace
        activeTab={activeTab}
        tabs={[
          { value: "quotes", label: terms.quotes },
          { value: "activities", label: terms.apuActivities },
          { value: "items", label: terms.apuItems },
        ]}
      >
        {activeTab === "quotes" ? (
          quotesSection
        ) : activeTab === "activities" ? (
          activitiesSection
        ) : (
          itemsSection
        )}
      </QuotesWorkspace>
    </div>
  );
}