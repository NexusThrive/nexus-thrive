import { MODULES, MODULE_LABELS } from "@/lib/admin/catalogs";
import type { ContractTerms } from "@/lib/benefits/benefits";

const inputClass =
  "h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ink";
const labelClass = "grid gap-1 text-xs font-medium text-muted-foreground";

/**
 * Términos de un código a medida (PENDIENTES §3): precio mensual acordado,
 * módulos exactos y límites. Todo opcional: vacío = el plan normal. Lo valida
 * el servidor (`validateContractTerms`).
 */
export function ContractFields({ terms, idPrefix }: { terms?: ContractTerms; idPrefix: string }) {
  const price = terms?.priceUsdCents != null ? (terms.priceUsdCents / 100).toString() : "";
  const selected = new Set(terms?.modules ?? []);
  return (
    <fieldset className="grid gap-3 rounded-lg border border-dashed border-border p-3 sm:col-span-2 lg:col-span-3">
      <legend className="px-1 text-xs font-semibold text-foreground">Contrato a medida (opcional)</legend>
      <p className="text-xs text-muted-foreground">
        Con precio, al canjear el negocio queda con la suscripción <b>activa</b> a ese precio y aparece en
        Facturación. Sin precio, es una prueba gratis que vence sola. Vacío = lo del plan.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          Precio mensual acordado (USD)
          <input name="priceUsd" inputMode="decimal" defaultValue={price} placeholder="Ej. 39.90" className={inputClass} />
        </label>
        <label className={labelClass}>
          Máximo de usuarios
          <input name="maxUsers" type="number" min={1} defaultValue={terms?.maxUsers ?? ""} placeholder="Los del plan" className={inputClass} />
        </label>
        <label className={labelClass}>
          Máximo de clientes activos
          <input name="maxCustomers" type="number" min={1} defaultValue={terms?.maxCustomers ?? ""} placeholder="Sin límite" className={inputClass} />
        </label>
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Módulos exactos (ninguno marcado = los del plan)</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {MODULES.filter((m) => m !== "dashboard").map((m) => (
            <label key={m} htmlFor={`${idPrefix}-${m}`} className="inline-flex items-center gap-1.5 text-xs">
              <input id={`${idPrefix}-${m}`} type="checkbox" name="modules" value={m} defaultChecked={selected.has(m)} className="size-4" />
              {MODULE_LABELS[m]}
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

/** Resumen corto del contrato para la lista (vacío si el código no tiene términos). */
export function contractSummary(terms: ContractTerms): string {
  const parts: string[] = [];
  if (terms.priceUsdCents != null) parts.push(`US$ ${(terms.priceUsdCents / 100).toFixed(2)}/mes`);
  if (terms.modules.length) parts.push(`${terms.modules.length} módulos a medida`);
  if (terms.maxUsers != null) parts.push(`hasta ${terms.maxUsers} usuarios`);
  if (terms.maxCustomers != null) parts.push(`hasta ${terms.maxCustomers} clientes`);
  return parts.join(" · ");
}
