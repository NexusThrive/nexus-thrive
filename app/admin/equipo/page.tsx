import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureSystemRoles, getStaffContext } from "@/lib/ops/access";
import { listRoles, listStaff } from "@/lib/ops/team";
import TeamView from "./_components/team-view";

export const metadata: Metadata = { title: "Equipo y permisos · NEXUS Operations Center" };

export default async function EquipoPage() {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("team.invite")) notFound();
  await ensureSystemRoles();
  const [members, roles] = await Promise.all([listStaff(), listRoles()]);
  return <TeamView me={staff.staffId} staff={members} roles={roles} permissions={staff.permissions} />;
}
