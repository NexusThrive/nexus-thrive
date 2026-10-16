import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Building2 } from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { canGovernBudget, type TenantRole } from "@/lib/tenant-context";
import { PROJECT_STATUSES, isValidProjectStatus } from "@/lib/projects";
import SearchInput from "@/components/molecules/search-input";
import FilterSelect from "@/components/molecules/filter-select";
import QuoteFolders from "./_components/quote-folders";
import LegacyQuotes from "./_components/legacy-quotes";
import { buttonVariants } from "@/components/atoms/button-variants";

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * Cotizaciones: un directorio con una carpeta por obra (`?q=&status=`), más
 * la carpeta de cotizaciones anteriores a la obra (`?folder=anteriores`).
 * El acceso lo garantiza `app/[tenant]/layout.tsx`.
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

  // El catálogo APU vivía aquí (?tab=activities|items).
  const legacyTab = firstString(sp.tab);
  if (legacyTab === "activities" || legacyTab === "items") {
    redirect(`/${tenantSlug}/catalog?tab=${legacyTab}`);
  }

  const tenantRecord = await db.orm.public.Tenant.where({ slug: tenantSlug, active: true }).first();
  if (!tenantRecord) {
    notFound();
  }
  const tenantDb = createTenantDb(tenantRecord.id);
  const { userId } = await auth();
  const member = userId ? await tenantDb.users.findByClerkUserId(userId) : null;
  const canGovern = canGovernBudget((member?.role ?? "STAFF") as TenantRole);

  const legacy = await tenantDb.projectQuotes.listLegacy();
  const showLegacy = firstString(sp.folder) === "anteriores";

  if (showLegacy) {
    const customers = await db.orm.public.Customer.where({ tenantId: tenantRecord.id })
      .orderBy((customer) => customer.name.asc())
      .select("id", "name")
      .all();
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <Link
            href={`/${tenantSlug}/quotes`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Volver a las carpetas
          </Link>
          <h1 className="font-display text-[clamp(24px,4.4vw,34px)] font-bold leading-[1.12] tracking-[-0.02em] text-foreground">
            Cotizaciones anteriores
          </h1>
        </header>
        <LegacyQuotes tenantSlug={tenantSlug} quotes={legacy} customers={customers} canMigrate={canGovern} />
      </div>
    );
  }

  const q = firstString(sp.q).trim();
  const statusRaw = firstString(sp.status);
  const status = isValidProjectStatus(statusRaw) ? statusRaw : undefined;
  const folders = await tenantDb.projectQuotes.listFolders({ q, status });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(24px,4.4vw,34px)] font-bold leading-[1.12] tracking-[-0.02em] text-foreground">Cotizaciones</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Una carpeta por obra con sus versiones emitidas y los seguimientos al cliente.
          </p>
        </div>
        <Link
          href={`/${tenantSlug}/projects`}
          className={`${buttonVariants({ variant: "outline" })} shrink-0 self-start`}
        >
          <Building2 aria-hidden="true" className="h-4 w-4" />
          Obras
        </Link>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          paramKey="q"
          pageParam="page"
          ariaLabel="Buscar carpeta por obra"
          placeholder="Buscar obra…"
          defaultValue={q}
        />
        <FilterSelect
          paramKey="status"
          pageParam="page"
          allLabel="Todos los estados"
          options={PROJECT_STATUSES}
          value={status ?? ""}
        />
      </div>

      <QuoteFolders tenantSlug={tenantSlug} folders={folders} legacyCount={q || status ? 0 : legacy.length} />
    </div>
  );
}
