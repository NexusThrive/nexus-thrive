import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VERTICAL_LABELS } from "@/lib/admin/catalogs";
import { listPlatformUsers } from "@/lib/admin/users-db";
import { getStaffContext } from "@/lib/ops/access";
import UsersView from "./_components/users-view";

export const metadata: Metadata = { title: "Usuarios · NEXUS Operations Center" };

/** Personas de la plataforma: cuántos negocios tiene cada una, su límite y la creación de un negocio para ella. */
export default async function UsuariosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("accounts.view")) notFound();
  const q = String((await searchParams).q ?? "").slice(0, 80);
  const { users, total } = await listPlatformUsers({ q });
  return <UsersView users={users} total={total} q={q} canEdit={staff.permissions.includes("accounts.edit")} canCreate={staff.permissions.includes("accounts.create")} verticals={Object.entries(VERTICAL_LABELS).map(([value, label]) => ({ value, label }))} />;
}
