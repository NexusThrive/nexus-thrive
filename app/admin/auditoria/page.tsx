import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { PageHeader } from "@/components/molecules/page-header";
import { AUDIT_ACTION_LABELS, createAdminDb } from "@/lib/admin/db";
import { getStaffContext } from "@/lib/ops/access";
import { listStaff } from "@/lib/ops/team";
import AuditLog from "../_components/audit-log";
import AuditFilters from "./audit-filters";

export const metadata: Metadata = { title: "Auditoría · NEXUS Operations Center" };

const PAGE = 40;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

/**
 * Bitácora completa del equipo: quién hizo qué, sobre qué negocio y cuándo.
 * Solo se agrega, nunca se edita. Filtros por acción e integrante.
 */
export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("audit.view")) notFound();
  const sp = await searchParams;
  const action = first(sp.accion);
  const actor = first(sp.integrante);
  const page = Math.max(1, Number.parseInt(first(sp.pagina), 10) || 1);

  const [rows, team] = await Promise.all([
    createAdminDb().listAuditLogs(PAGE + 1, {
      action: action && AUDIT_ACTION_LABELS[action] ? action : undefined,
      actorEmail: actor || undefined,
      offset: (page - 1) * PAGE,
    }),
    listStaff(),
  ]);
  const hasNext = rows.length > PAGE;
  const href = (p: number) => {
    const q = new URLSearchParams();
    if (action) q.set("accion", action);
    if (actor) q.set("integrante", actor);
    if (p > 1) q.set("pagina", String(p));
    return q.size ? `/admin/auditoria?${q}` : "/admin/auditoria";
  };

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Sistema" title="Auditoría" description="Cada acción del equipo NEXUS sobre la plataforma y los negocios. No se edita ni se borra." />
      <AuditFilters
        action={action}
        actor={actor}
        actions={Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }))}
        actors={team.map((m) => ({ value: m.email, label: m.name ?? m.email }))}
      />
      <section className="rounded-lg border border-border bg-surface p-5">
        <AuditLog rows={rows.slice(0, PAGE)} />
      </section>
      <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted-foreground">Página {page}</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={href(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Anterior
            </Link>
          ) : null}
          {hasNext ? (
            <Link href={href(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Siguiente
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
