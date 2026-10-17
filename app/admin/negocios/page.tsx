import type { Metadata } from "next";
import { headers } from "next/headers";
import { isVertical } from "@/lib/admin-catalogs";
import { createAdminDb, type TenantSortKey } from "@/lib/admin-db";
import { getStaffContext } from "@/lib/ops/access";
import { notFound } from "next/navigation";
import NegociosHeader from "./_components/negocios-header";
import TenantTable from "../_components/tenant-table";
import TenantToolbar from "../_components/tenant-toolbar";

export const metadata: Metadata = { title: "Negocios · NEXUS Operations Center" };

const PAGE_SIZE = 12;
const SORTS: TenantSortKey[] = ["created_desc", "created_asc", "name_asc", "name_desc", "activity_desc", "activity_asc"];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

/**
 * Directorio de negocios: búsqueda, filtros por rubro y estado, orden y
 * "requieren atención". La URL es la fuente de verdad de los filtros. Cada
 * fila abre la vista rápida y desde ahí la ficha 360°.
 */
export default async function NegociosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("accounts.view")) notFound();

  const sp = await searchParams;
  const q = first(sp.q).trim();
  const verticalRaw = first(sp.vertical);
  const vertical = isVertical(verticalRaw) ? verticalRaw : undefined;
  const statusRaw = first(sp.status);
  const activeStatus = statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all";
  const attentionOnly = first(sp.attention) === "1";
  const sort = SORTS.includes(first(sp.sort) as TenantSortKey) ? (first(sp.sort) as TenantSortKey) : "created_desc";
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);

  const host = (await headers()).get("host") ?? "localhost:3000";
  const adminDb = createAdminDb();
  const [list, attention] = await Promise.all([
    adminDb.listTenants({ host, q, vertical, activeStatus, attentionOnly, sort, page, limit: PAGE_SIZE }),
    adminDb.listTenants({ host, attentionOnly: true, limit: 1 }),
  ]);
  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));

  return (
    <div className="grid gap-5">
      <NegociosHeader total={list.total} canCreate={staff.permissions.includes("accounts.create")} />
      <TenantToolbar
        q={q}
        vertical={vertical}
        status={activeStatus === "all" ? undefined : activeStatus}
        sort={sort}
        attentionOnly={attentionOnly}
        attentionCount={attention.total}
      />
      <TenantTable rows={list.rows} sort={sort} page={Math.min(page, totalPages)} totalPages={totalPages} total={list.total} />
    </div>
  );
}
