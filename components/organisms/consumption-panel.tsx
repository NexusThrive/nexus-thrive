import { Alert } from "@/components/molecules/alert";
import { needsAttention, type ConsumptionRow } from "@/lib/usage/consumption";

const nf = new Intl.NumberFormat("es-CO");
const STATE_TEXT = { ok: "", near: "Cerca del límite", over: "Límite alcanzado", unlimited: "Sin límite acordado" } as const;
const BAR = { ok: "bg-accent", near: "bg-warning-foreground", over: "bg-danger", unlimited: "bg-border" } as const;

/** Consumo del negocio frente a sus límites: barra por cada uno y aviso cuando se acercan. */
export function ConsumptionPanel({ rows }: { rows: ConsumptionRow[] }) {
  const attention = needsAttention(rows);
  return (
    <section aria-labelledby="plan-usage" className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-[18px] py-4">
        <h2 id="plan-usage" className="font-display text-[15px] font-semibold">Consumo</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Tu plan limita cuánto usas, no qué funciones tienes: todas están disponibles.</p>
      </div>
      <div className="grid gap-3 p-[18px]">
        {attention.length ? (
          <Alert tone={attention.some((r) => r.status === "over") ? "danger" : "warning"}>
            {attention.map((r) => `${r.label}: ${STATE_TEXT[r.status].toLowerCase()}`).join(" · ")}. Escríbenos para ampliar tu límite.
          </Alert>
        ) : null}
        <ul className="grid gap-4">
          {rows.map((r) => (
            <li key={r.key} className="grid gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                <span className="font-medium">{r.label}{r.period ? <span className="font-normal text-muted-foreground"> · este mes</span> : null}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {nf.format(r.used)}
                  {r.limit === null ? "" : ` de ${nf.format(r.limit)}`}
                  {STATE_TEXT[r.status] ? ` · ${STATE_TEXT[r.status]}` : ""}
                </span>
              </div>
              {r.limit === null ? null : (
                <div role="progressbar" aria-label={`${r.label}: ${r.pct} % del límite`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.pct} className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div className={`h-full ${BAR[r.status]}`} style={{ width: `${r.pct}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
