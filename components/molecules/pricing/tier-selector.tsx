"use client";

import type { KeyboardEvent } from "react";
import { RevealText } from "@/components/atoms/reveal-text";
import type { TierKey } from "@/lib/pricing/catalog";
import { cn } from "@/lib/utils";

const ORDER: TierKey[] = ["essential", "elite", "signature"];
const BAR_COLOR: Record<TierKey, string> = {
  essential: "bg-[var(--t1)]",
  elite: "bg-[var(--t2)]",
  signature: "bg-accent",
};

/**
 * Selector de nivel (radiogroup): tres opciones con barras de nivel en el
 * ángulo de la N y una pastilla que se desliza con rebote. Flechas para
 * cambiar. Si Elite pasa a Pre Signature, su nombre cambia letra por letra
 * y la tercera barra se tiñe de azul a oro.
 */
export function TierSelector({
  value,
  preSignature,
  prices,
  onChange,
}: {
  value: TierKey;
  preSignature: boolean;
  /** Texto de precio bajo cada nivel ("Gratis", "desde $29/mes"). */
  prices: Record<TierKey, string>;
  onChange: (tier: TierKey) => void;
}) {
  const index = ORDER.indexOf(value);

  function onKeyDown(event: KeyboardEvent) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? 2 : 0;
    if (!step) return;
    event.preventDefault();
    onChange(ORDER[(index + step) % 3]);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Nivel"
      onKeyDown={onKeyDown}
      className="relative grid grid-cols-3 rounded-lg border border-border bg-surface-muted p-1"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 z-0 w-[calc((100%-8px)/3)] rounded-md bg-surface shadow-[0_1px_2px_rgba(0,0,0,.08),0_0_0_1px_color-mix(in_oklab,var(--acc)_55%,transparent)] transition-transform duration-[520ms] ease-[var(--nx-ease-spring)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {ORDER.map((tier, i) => {
        const checked = tier === value;
        const isPre = tier === "elite" && checked && preSignature;
        const level = i + 1;
        return (
          <button
            key={tier}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(tier)}
            data-press=""
            className="relative z-10 grid min-w-0 justify-items-start gap-0.5 rounded-md px-3 pb-[11px] pt-2.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-ring max-[520px]:px-2"
          >
            <span className="mb-[5px] flex gap-[3px]" aria-hidden="true">
              {[1, 2, 3].map((bar) => (
                <i
                  key={bar}
                  className={cn(
                    "h-1 w-2.5 -skew-x-[24deg] bg-border-strong transition-colors duration-[400ms]",
                    checked && bar <= level && BAR_COLOR[tier],
                    isPre && bar === 3 && "bg-[linear-gradient(90deg,var(--t2),var(--nx-gold-500))]",
                  )}
                />
              ))}
            </span>
            <span
              className={cn(
                "max-w-full truncate font-display text-[11.5px] font-bold uppercase tracking-[0.14em] transition-colors max-[520px]:whitespace-normal max-[520px]:text-[10.5px] max-[520px]:tracking-[0.08em]",
                checked ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {isPre ? (
                <RevealText key="pre" parts={[{ text: "Pre Signature", className: "text-accent-text" }]} />
              ) : (
                <>
                  <span className="max-[520px]:hidden">Thrive </span>
                  {tier === "elite" ? <RevealText key="elite" parts={["Elite"]} /> : tier === "essential" ? "Essential" : "Signature"}
                </>
              )}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground max-[520px]:text-[11px]">{prices[tier]}</span>
          </button>
        );
      })}
    </div>
  );
}
