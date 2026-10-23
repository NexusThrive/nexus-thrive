import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { BookOpen, ImageIcon, Layers, Package, Upload } from "lucide-react";
import { createTenantDb } from "@/lib/tenant/db";
import { canGovernBudget, type TenantRole } from "@/lib/tenant/context";
import { getQuoteTerms } from "@/lib/vertical-terms";
import { formatDateShort } from "@/lib/format";
import { isValidCategory } from "@/lib/construction/apu-engine";
import TabNav from "@/components/molecules/tab-nav";
import ItemsBank from "./_components/items-bank";
import ActivityCatalog from "./_components/activity-catalog";
import { PageHeader } from "@/components/molecules/page-header";
import { KpiCard } from "@/components/molecules/kpi-card";
import { buttonVariants } from "@/components/atoms/button-variants";
import { requirePageContext } from "@/lib/tenant/context";

const ITEMS_PAGE_SIZE = 10;
const ACTIVITIES_PAGE_SIZE = 50;

type CatalogTab = "activities" | "items";

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Métrica del catálogo: `KpiCard` con el icono discreto dentro de la etiqueta. */
function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number | string; hint: string }) {
  return (
    <KpiCard
      label={label}
      value={value}
      hint={
        <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
          {icon}
          {hint}
        </span>
      }
    />
  );
}

/**
 * Catálogo APU del negocio: actividades (con sus APU auxiliares) e insumos.
 * Las obras importan actividades de aquí a su presupuesto. La URL es la
 * fuente de verdad (`?tab=&aq=&ach=&akind=&aqpage=&iq=&ic=&ia=&ipage=`).
 * El acceso (tenant activo + miembro) lo garantiza `app/[tenant]/layout.tsx`.
 */
export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const activeTab: CatalogTab = firstString(sp.tab) === "items" ? "items" : "activities";

  // Sesión + negocio activo + membresía activa (SEC-03): no basta el layout.
  const pageCtx = await requirePageContext(tenantSlug, "/catalog");
  const tenantRecord = pageCtx.tenant;
  const tenantDb = createTenantDb(tenantRecord.id);
  const { userId } = await auth();
  const member = userId ? await tenantDb.users.findByClerkUserId(userId) : null;
  const canManageCatalog = canGovernBudget((member?.role ?? "STAFF") as TenantRole);
  const terms = getQuoteTerms(tenantRecord.vertical);
  const overview = await tenantDb.apu.getOverview();

  let activitiesSection: React.ReactNode = null;
  let itemsSection: React.ReactNode = null;

  if (activeTab === "activities") {
    const q = firstString(sp.aq).trim();
    const chapterCode = firstString(sp.ach).trim() || undefined;
    const kind = firstString(sp.akind) === "auxiliary" ? "auxiliary" : "activity";
    const pageRaw = Number.parseInt(firstString(sp.aqpage), 10);
    const requestedPage = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const [catalog, items, chapters, p99] = await Promise.all([
      tenantDb.apu.listActivities({
        q,
        chapterCode,
        kind,
        page: requestedPage,
        limit: ACTIVITIES_PAGE_SIZE,
      }),
      tenantDb.apu.listAllItems(),
      tenantDb.apu.listChapters(),
      tenantDb.apu.getP99Thresholds(),
    ]);
    const totalPages = Math.max(1, Math.ceil(catalog.total / ACTIVITIES_PAGE_SIZE));
    activitiesSection = (
      <ActivityCatalog
        tenantSlug={tenantSlug}
        rows={catalog.rows}
        total={catalog.total}
        page={Math.min(requestedPage, totalPages)}
        totalPages={totalPages}
        chapters={chapters}
        chapterCode={chapterCode ?? ""}
        kind={kind}
        items={items}
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
      <PageHeader
        eyebrow="Construcción"
        title="Catálogo APU"
        description={<>Análisis de precios unitarios e insumos de{" "}
            <span className="font-medium text-foreground/80">{tenantRecord.name}</span>. Las obras
            importan actividades de aquí a su presupuesto.</>}
        actions={<Link
          href={`/${tenantSlug}/catalog/import`}
          className={buttonVariants({ variant: "outline" })}
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          Importar APU
        </Link>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<BookOpen aria-hidden="true" className="h-4 w-4" />}
          label={terms.apuActivities}
          value={overview.activities}
          hint={`${overview.chapters} capítulos`}
        />
        <Stat
          icon={<Layers aria-hidden="true" className="h-4 w-4" />}
          label="APU auxiliares"
          value={overview.auxiliaries}
          hint="Usados dentro de otros APU"
        />
        <Stat
          icon={<Package aria-hidden="true" className="h-4 w-4" />}
          label={terms.apuItems}
          value={overview.items}
          hint="Vigentes"
        />
        <Stat
          icon={<ImageIcon aria-hidden="true" className="h-4 w-4" />}
          label="Con foto"
          value={overview.itemsWithImage}
          hint={overview.lastImport ? `Última importación ${formatDateShort(overview.lastImport.createdAt)}` : "Sin importaciones"}
        />
      </div>

      <TabNav
        activeTab={activeTab}
        tabs={[
          { value: "activities", label: terms.apuActivities },
          { value: "items", label: terms.apuItems },
        ]}
      >
        {activeTab === "activities" ? activitiesSection : itemsSection}
      </TabNav>
    </div>
  );
}
