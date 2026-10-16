"use client";

import { cn } from "@/lib/cn";
import type { RoleValue, TeamMember } from "./settings-shell";

/**
 * Etiqueta visible del rol. El esquema Prisma define `Role` como
 * SUPERADMIN | OWNER | STAFF; de cara al usuario se muestran como
 * ADMIN / EMPLEADO (el OWNER es el administrador del negocio).
 */
const ROLE_LABELS: Record<RoleValue, string> = {
  SUPERADMIN: "SUPER ADMIN",
  OWNER: "ADMIN",
  STAFF: "EMPLEADO",
};

const ROLE_BADGE: Record<RoleValue, string> = {
  SUPERADMIN: "bg-gold-600/15 text-gold-700",
  OWNER: "bg-primary/10 text-primary",
  STAFF: "bg-muted text-muted-foreground",
};

const ROLE_ORDER: Record<RoleValue, number> = {
  SUPERADMIN: 0,
  OWNER: 1,
  STAFF: 2,
};

/**
 * Pestaña "Equipo": lista real de usuarios del tenant con su rol. Los datos
 * llegan desde el Server Component (aislados por `tenantId`).
 */
export default function TeamTab({ members }: { members: TeamMember[] }) {
  const admins = members.filter(
    (member) => member.role === "OWNER" || member.role === "SUPERADMIN",
  ).length;
  const employees = members.filter((member) => member.role === "STAFF").length;

  const sorted = [...members].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-foreground">Equipo del negocio</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Usuarios vinculados a este negocio y sus roles.
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          Aún no hay usuarios. El primer usuario se crea durante el onboarding.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-strong text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 text-right font-medium">Rol</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((member) => (
                <tr key={member.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {member.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {member.email || "Sin email"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      title={member.role}
                      className={cn(
                        "inline-block rounded px-2 py-1 text-xs font-medium",
                        ROLE_BADGE[member.role],
                      )}
                    >
                      {ROLE_LABELS[member.role]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dl className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-xs">
        <div>
          <dt className="font-medium text-foreground/80">Total</dt>
          <dd className="mt-1 text-lg font-bold text-foreground">{members.length}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/80">Administradores</dt>
          <dd className="mt-1 text-lg font-bold text-primary">{admins}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/80">Empleados</dt>
          <dd className="mt-1 text-lg font-bold text-muted-foreground">{employees}</dd>
        </div>
      </dl>
    </div>
  );
}
