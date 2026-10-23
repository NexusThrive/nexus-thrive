import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { ProgressBar } from "@/components/atoms/progress-bar";
import { EmptyState } from "@/components/molecules/empty-state";
import { PageHeader } from "@/components/molecules/page-header";
import { isVertical, VERTICAL_LABELS } from "@/lib/admin/catalogs";
import { getStaffContext } from "@/lib/ops/access";
import { onboardingBoard } from "@/lib/ops/onboarding-board";
import { CHECKLIST_STEPS } from "@/lib/ops/onboarding-checklist";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Onboarding · NEXUS Operations Center" };

/**
 * Puesta en marcha de cuentas nuevas: qué le falta a cada negocio para
 * quedar operando. El checklist se calcula con sus datos reales.
 */
export default async function OnboardingPage() {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("accounts.view")) notFound();
  const rows = await onboardingBoard();
  const stuck = rows.filter((r) => r.pct < 50).length;
  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Cuentas"
        title="Onboarding"
        description={`${rows.length} cuentas en puesta en marcha${stuck ? ` · ${stuck} por debajo del 50 %` : ""}. Cada paso se marca solo cuando el negocio lo hace.`}
      />
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState title="Nadie en puesta en marcha" description="Las cuentas nuevas aparecen aquí durante sus primeros 30 días." />
        </div>
      ) : (
        <>
          <ul className="grid gap-2.5 lg:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/negocios/${r.id}`} className="grid gap-2 rounded-lg border border-border bg-surface p-3.5">
                  <span className="flex items-center justify-between gap-2">
                    <b className="truncate font-medium">{r.name}</b>
                    <span className="font-mono text-xs tabular-nums">{r.done}/{r.total}</span>
                  </span>
                  <ProgressBar value={r.pct / 100} tone="gold" />
                  <small className="text-xs text-muted-foreground">
                    {r.next ? `Siguiente: ${r.next.label}` : "Listo"} · {r.managerName ?? "sin responsable"}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface lg:block">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Negocio</th>
                  {CHECKLIST_STEPS.map((s) => (
                    <th key={s.key} title={s.hint} className="px-2 py-2.5 text-center font-medium">
                      {s.label}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 font-medium">Avance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <Link href={`/admin/negocios/${r.id}`} className="grid min-w-0">
                        <b className="truncate font-medium">{r.name}</b>
                        <small className="truncate text-xs text-muted-foreground">
                          {isVertical(r.vertical) ? VERTICAL_LABELS[r.vertical] : r.vertical} · {r.managerName ?? <span className="text-danger">sin responsable</span>}
                        </small>
                      </Link>
                    </td>
                    {r.steps.map((s) => (
                      <td key={s.key} className="px-2 py-3 text-center">
                        {s.done ? (
                          <Check aria-label={`${s.label}: hecho`} className="mx-auto size-4 text-success" />
                        ) : (
                          <Circle aria-label={`${s.label}: pendiente`} className={cn("mx-auto size-3.5", r.next?.key === s.key ? "text-accent-text" : "text-border-strong")} />
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <ProgressBar value={r.pct / 100} tone="gold" className="w-20" />
                        <span className="whitespace-nowrap font-mono text-xs tabular-nums">{r.pct} %</span>
                        {!r.active ? <Badge tone="danger">Suspendido</Badge> : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
