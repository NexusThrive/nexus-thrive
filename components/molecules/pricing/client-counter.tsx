"use client";

import { useState } from "react";
import { Infinity as InfinityIcon, Lock, Minus, Plus, Sparkles, Users } from "lucide-react";
import { Chip } from "@/components/atoms/chip";
import { PRICING, type EffectiveTier, type TierKey } from "@/lib/pricing/catalog";
import { cn } from "@/lib/utils";

const PRESETS = [50, 100, 150, 250, 500];

/**
 * Número de clientes. En Essential es fijo (10 de prueba) y en Signature es
 * ilimitado; en Elite se escribe o se ajusta de a 10, con una barra que
 * marca el límite de 150 y atajos. Avisa cuando el plan pasa a Pre Signature.
 */
export function ClientCounter({
  tier,
  effective,
  clients,
  moduleCount,
  onChange,
}: {
  tier: TierKey;
  effective: EffectiveTier;
  clients: number;
  moduleCount: number;
  onChange: (clients: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const row = "flex min-h-14 flex-wrap items-center gap-3 overflow-hidden rounded-lg border border-border bg-surface-muted px-3 py-2.5";
  const icon = "grid size-9 shrink-0 place-items-center rounded-md bg-[var(--accs)] text-[var(--acc)] transition-colors duration-500 [&_svg]:size-[18px]";

  if (tier === "essential") {
    return (
      <div key="e" className={cn(row, "nx-view-in")}>
        <span className={icon}><Users /></span>
        <div className="min-w-0 flex-1 leading-snug">
          <b className="block font-semibold">{PRICING.essentialClients} clientes de prueba</b>
          <small className="text-[12.5px] text-muted-foreground">Fijo en Essential. Pasa a Elite para escribir cuántos clientes tienes.</small>
        </div>
        <Lock aria-hidden="true" className="size-4 text-muted-foreground" />
      </div>
    );
  }
  if (tier === "signature") {
    return (
      <div key="s" className={cn(row, "nx-view-in")}>
        <span className={icon}><InfinityIcon /></span>
        <div className="min-w-0 flex-1 leading-snug">
          <b className="block font-semibold">Clientes ilimitados</b>
          <small className="text-[12.5px] text-muted-foreground">Signature no cobra por cliente.</small>
        </div>
      </div>
    );
  }

  const { includedClients, perClient, perClientOver, max } = PRICING.elite;
  const over = clients > max;
  return (
    <div key="x" className="nx-view-in grid gap-2.5">
      <div className={row}>
        <span className={icon}><Users /></span>
        <div className="min-w-0 flex-1 leading-snug">
          <label htmlFor="pricing-clients" className="block font-semibold">Número de clientes</label>
          <small id="pricing-clients-hint" className="text-[12.5px] text-muted-foreground">
            {clients <= includedClients ? `${includedClients} incluidos en el plan` : `$${perClient.toFixed(2)} por cliente sobre ${includedClients}`}
          </small>
        </div>
        <div
          className={cn(
            "flex items-stretch overflow-hidden rounded-md border bg-surface transition-[border-color,box-shadow] focus-within:border-ring focus-within:shadow-[0_0_0_3px_rgba(212,175,55,.2)] max-[520px]:w-full",
            over ? "border-accent" : "border-border-input",
          )}
        >
          <button type="button" aria-label="Restar 10" onClick={() => onChange(clients - 10)} className="grid w-10 place-items-center text-muted-foreground hover:bg-surface-muted hover:text-foreground max-[520px]:w-[52px]">
            <Minus className="size-4" />
          </button>
          <input
            id="pricing-clients"
            type="number"
            inputMode="numeric"
            min={PRICING.minClients}
            max={PRICING.maxClients}
            aria-describedby="pricing-clients-hint"
            value={draft ?? clients}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) onChange(n);
            }}
            onBlur={() => setDraft(null)}
            className="h-[42px] w-[84px] bg-transparent text-center font-display text-lg font-bold tabular-nums outline-none [appearance:textfield] max-[520px]:flex-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button type="button" aria-label="Sumar 10" onClick={() => onChange(clients + 10)} className="grid w-10 place-items-center text-muted-foreground hover:bg-surface-muted hover:text-foreground max-[520px]:w-[52px]">
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="relative h-1.5 bg-border">
        <span className="absolute inset-y-0 left-0 bg-[var(--acc)] transition-[width] duration-500 ease-[var(--nx-ease-out)]" style={{ width: `${Math.min(100, (clients / 300) * 100)}%` }} />
        <span className="absolute -inset-y-1 left-1/2 w-0.5 bg-accent" />
      </div>
      <div className="flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
        <span>0</span>
        <span>150 · límite Elite</span>
        <span>300+</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((n) => (
          <Chip key={n} selected={n === clients} onClick={() => onChange(n)} className="h-7 px-2.5 font-mono text-xs">
            {n}
          </Chip>
        ))}
      </div>
      <p className={cn("flex items-start gap-2 text-[12.5px]", effective === "pre" ? "text-accent-text" : "text-muted-foreground")}>
        {effective === "pre" ? (
          <>
            <Sparkles aria-hidden="true" className="mt-px size-4 shrink-0" />
            Pasaste de 150 clientes con pocos módulos: tu plan ahora es Pre Signature. Cada cliente extra cuesta ${perClientOver.toFixed(2)}.
          </>
        ) : over ? (
          <>
            <Users aria-hidden="true" className="mt-px size-4 shrink-0" />
            Más de 150 clientes con {moduleCount} módulos activos: sigues en Elite.
          </>
        ) : (
          "Elite cubre hasta 150 clientes. Si pasas de ahí, el plan se ajusta solo."
        )}
      </p>
    </div>
  );
}
