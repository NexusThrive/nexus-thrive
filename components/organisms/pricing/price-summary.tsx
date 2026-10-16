"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { N_PATH } from "@nexus/brand/BrandLogo";
import { Odometer } from "@/components/atoms/odometer";
import { RevealText } from "@/components/atoms/reveal-text";
import { BillingToggle } from "@/components/molecules/pricing/billing-toggle";
import { burstFrom, EASE_IN_OUT, EASE_SPRING, motionOff } from "@/lib/motion";
import { TIERS, type Billing, type EffectiveTier } from "@/lib/pricing/catalog";
import { formatUSD, type Quote } from "@/lib/pricing/calc";
import { cn } from "@/lib/utils";
import styles from "./pricing.module.css";

const LEVEL_SCORE: Record<EffectiveTier, number> = { essential: 10, elite: 20, pre: 25, signature: 30 };
const CTA: Record<EffectiveTier, string> = {
  essential: "Empezar gratis",
  elite: "Elegir Thrive Elite",
  pre: "Elegir Pre Signature",
  signature: "Elegir Thrive Signature",
};

/**
 * Resumen del plan: badge de nivel, nombre que entra letra por letra, precio
 * en odómetro (con la diferencia flotando al cambiar), facturación, desglose,
 * lo que incluye y el CTA. Al subir de nivel un destello cruza el panel y
 * caen cortes oro; en Signature el panel se vuelve Ink.
 */
export function PriceSummary({
  tier,
  quote,
  billing,
  onBillingChange,
  features,
  suggestion,
  ctaHref,
}: {
  tier: EffectiveTier;
  quote: Quote;
  billing: Billing;
  onBillingChange: (b: Billing) => void;
  features: [boolean, string][];
  /** Precio de Signature completo si conviene sugerirlo. */
  suggestion?: { price: number; onAccept: () => void };
  ctaHref: string;
}) {
  const info = TIERS[tier];
  const free = tier === "essential";
  const badgeRef = useRef<HTMLSpanElement>(null);
  const sweepRef = useRef<HTMLSpanElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const last = useRef<{ tier: EffectiveTier; total: number } | null>(null);

  useEffect(() => {
    const prev = last.current;
    last.current = { tier, total: quote.monthly };
    if (!prev || motionOff()) return;
    if (prev.tier !== tier) {
      sweepRef.current?.animate(
        [
          { transform: "translateX(-120%) skewX(-24deg)", opacity: 1 },
          { transform: "translateX(320%) skewX(-24deg)", opacity: 1 },
        ],
        { duration: 900, easing: EASE_IN_OUT },
      );
      badgeRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], {
        duration: 500,
        easing: EASE_SPRING,
      });
      if (LEVEL_SCORE[tier] > LEVEL_SCORE[prev.tier]) burstFrom(badgeRef.current, 28);
    } else if (prev.total !== quote.monthly && !free && prev.tier !== "essential" && priceRef.current) {
      // La diferencia sube y se desvanece sobre el precio.
      const diff = quote.monthly - prev.total;
      const tag = document.createElement("span");
      tag.className = cn(
        "pointer-events-none absolute left-0 -top-1.5 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-xs font-semibold",
        diff > 0 ? "bg-[color-mix(in_oklab,var(--acc)_18%,transparent)] text-[var(--acc)]" : "bg-success-subtle text-success",
      );
      tag.textContent = `${diff > 0 ? "+" : "−"}${formatUSD(Math.abs(diff))}`;
      priceRef.current.appendChild(tag);
      tag
        .animate(
          [
            { opacity: 0, transform: "translateY(6px)" },
            { opacity: 1, transform: "translateY(-10px)", offset: 0.25 },
            { opacity: 0, transform: "translateY(-30px)" },
          ],
          { duration: 1300, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
        )
        .finished.then(() => tag.remove(), () => tag.remove());
    }
  }, [tier, quote.monthly, free]);

  const total = billing === "annual" ? quote.annual : quote.monthly;

  return (
    <aside className={styles.sum} aria-live="polite">
      <svg className={styles.glyph} viewBox="394.83 239.93 734.96 634.25" aria-hidden="true">
        <path d={N_PATH} fill="currentColor" />
      </svg>
      <span ref={sweepRef} className={styles.sweep} aria-hidden="true" />
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+12px)] grid gap-5 px-[clamp(18px,3vw,32px)] py-7">
        <span ref={badgeRef} className={styles.badge}>
          <i aria-hidden="true" className="h-[11px] w-[3px] -skew-x-[24deg] bg-current" />
          Nivel {tier === "pre" ? "2+" : info.level} de 3
        </span>
        <div>
          <h2 className="font-display text-[clamp(24px,3vw,30px)] font-bold uppercase leading-[1.1] tracking-[0.04em]">
            <span className={cn("font-semibold text-[var(--pmu)]", styles.accentGold)}>Thrive </span>
            <RevealText key={tier} parts={[info.name]} />
          </h2>
          <p className="mt-1.5 max-w-[40ch] text-[13.5px] text-[var(--pmu)]">{info.description}</p>
        </div>

        <div ref={priceRef} className="relative flex min-h-16 items-end gap-2">
          {free ? (
            <RevealText key="free" parts={["Gratis"]} className="font-display text-[clamp(40px,5vw,52px)] font-bold leading-none tracking-[-0.03em]" />
          ) : (
            <Odometer
              value={formatUSD(quote.monthly).slice(1)}
              prefix="$"
              className="font-display text-[clamp(46px,6vw,60px)] font-bold leading-none tracking-[-0.03em]"
            />
          )}
          <span className="pb-2 text-[13.5px] leading-tight text-[var(--pmu)]">
            {free ? (<>sin tarjeta<br />de crédito</>) : billing === "annual" ? (<>/mes<br />facturado anual</>) : (<>/mes<br />en dólares</>)}
          </span>
        </div>

        <div className={free ? "invisible" : undefined}>
          <BillingToggle value={billing} onChange={onBillingChange} />
        </div>

        <ul className="grid border-t border-[var(--pln)] min-[960px]:max-h-[calc(100vh-560px)] min-[960px]:min-h-[150px] min-[960px]:overflow-y-auto min-[960px]:overscroll-contain">
          {quote.lines.map((line) => (
            <li key={line.label} className="nx-view-in flex justify-between gap-3 border-b border-[var(--pln)] py-[9px] text-[13px]">
              <span className="min-w-0 text-[var(--pmu)]">{line.label}</span>
              <span className={cn("whitespace-nowrap font-mono tabular-nums", line.amount != null && line.amount < 0 && "text-success")}>
                {line.amount == null ? line.text : line.amount < 0 ? `−${formatUSD(-line.amount)}` : formatUSD(line.amount)}
              </span>
            </li>
          ))}
          {!free ? (
            <li className="flex justify-between gap-3 py-[9px] text-sm font-semibold">
              <span>{billing === "annual" ? "Total anual" : "Total mensual"}</span>
              <span className="font-mono tabular-nums">{formatUSD(total)}</span>
            </li>
          ) : null}
        </ul>

        {suggestion ? (
          <div className="nx-view-in flex items-start gap-2.5 rounded-md border border-[color-mix(in_oklab,var(--nx-gold-500)_55%,transparent)] bg-[color-mix(in_oklab,var(--nx-gold-500)_10%,transparent)] px-3 py-[11px] text-[12.5px]">
            <Sparkles aria-hidden="true" className="mt-px size-4 shrink-0 text-accent" />
            <div>
              Con esta configuración Signature te sale casi igual o menos: {formatUSD(suggestion.price)}/mes con todos los módulos y clientes ilimitados.
              <br />
              <button type="button" onClick={suggestion.onAccept} className="mt-1 border-b border-accent font-semibold">
                Ver Signature
              </button>
            </div>
          </div>
        ) : null}

        <ul className="grid gap-2">
          {features.map(([ok, text], i) => (
            <li key={`${tier}-${text}`} className={cn("nx-rise flex items-start gap-[9px] text-[13px]", !ok && "text-[var(--pmu)]")} style={{ ["--i" as string]: i * 0.8 }}>
              {ok ? <Check aria-hidden="true" className={cn("mt-px size-4 shrink-0", styles.accent, styles.accentGold)} /> : <X aria-hidden="true" className="mt-px size-4 shrink-0" />}
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <Link
          href={ctaHref}
          data-press=""
          className={cn(styles.cta, "group inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-md text-[14.5px] font-semibold")}
        >
          {CTA[tier]}
          <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-[3px]" />
        </Link>
        <p className="text-center text-xs text-[var(--pmu)]">
          {free ? "Sin tarjeta. Pasa a Elite cuando quieras y conservas tus datos." : "Precios en USD, sin impuestos. Cambia de plan o de módulos cuando quieras."}
        </p>
      </div>
    </aside>
  );
}
