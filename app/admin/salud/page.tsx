import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader } from "@/components/molecules/page-header";
import { getVerticalIcon } from "@/lib/admin/vertical-icons";
import { isVertical } from "@/lib/admin-catalogs";
import { getStaffContext } from "@/lib/ops/access";
import { accountHealth } from "@/lib/ops/health";
import { HEALTH_LEVELS } from "@/lib/ops/health-rules";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Salud de cuentas · NEXUS Operations Center" };

const BAR = { healthy: "bg-success", watch: "bg-foreground/60", at_risk: "bg-accent", critical: "bg-danger" } as const;

/**
 * Salud de cada cuenta, de la más débil a la más fuerte. El puntaje se
 * explica factor por factor y propone la acción de mayor impacto.
 */
export default async function SaludPage() {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("accounts.view")) notFound();
  const rows = await accountHealth();
  const count = (l: keyof typeof HEALTH_LEVELS) => rows.filter((r) => r.level === l).length;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader eyebrow="Clientes" title="Salud de cuentas" description="Actividad, adopción, pagos, soporte y satisfacción suman 100. Las cuentas más débiles van primero." />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard label="Saludables" value={count("healthy")} index={0} />
        <KpiCard label="En observación" value={count("watch")} index={1} />
        <KpiCard label="En riesgo" value={count("at_risk")} alert={count("at_risk") > 0} index={2} />
        <KpiCard label="Críticas" value={count("critical")} alert={count("critical") > 0} index={3} />
      </div>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
        {rows.map((r) => {
          const Icon = isVertical(r.vertical) ? getVerticalIcon(r.vertical).icon : null;
          return (
            <li key={r.id} className="min-w-0 rounded-lg border border-border bg-surface">
              <details className="group">
                <summary className="flex min-w-0 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-md font-display text-[17px] font-bold tabular-nums text-white", BAR[r.level])}>{r.score}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /> : null}
                      <b className="truncate font-medium">{r.name}</b>
                    </span>
                    <small className="block truncate text-xs text-muted-foreground">{r.nextAction ? `Siguiente: ${r.nextAction}` : "Todo en orden"} · {r.managerName ?? "sin responsable"}</small>
                  </span>
                  <Badge tone={HEALTH_LEVELS[r.level].tone}>{HEALTH_LEVELS[r.level].label}</Badge>
                </summary>
                <div className="grid gap-2 border-t border-border px-4 py-3 sm:grid-cols-5">
                  {r.factors.map((f) => (
                    <div key={f.key} className="grid gap-1 rounded-md bg-surface-muted p-2.5">
                      <span className="flex items-baseline justify-between gap-2 text-[12.5px] font-semibold">
                        {f.label}
                        <span className="font-mono text-[11px] tabular-nums">
                          {f.points}/{f.max}
                        </span>
                      </span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-border">
                        <span className={cn("block h-full", f.points / f.max >= 0.75 ? "bg-success" : f.points / f.max >= 0.4 ? "bg-accent" : "bg-danger")} style={{ width: `${(f.points / f.max) * 100}%` }} />
                      </span>
                      <small className="text-xs text-muted-foreground">{f.reason}</small>
                      {f.action ? <small className="text-xs font-medium">→ {f.action}</small> : null}
                    </div>
                  ))}
                  <Link href={`/admin/negocios/${r.id}`} className="text-[13px] font-medium text-accent-text hover:underline sm:col-span-5">
                    Abrir ficha 360° →
                  </Link>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
