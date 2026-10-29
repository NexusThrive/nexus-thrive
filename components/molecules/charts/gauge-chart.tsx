"use client";

import { useLayoutEffect, useRef } from "react";
import { RollingNumber } from "@/components/atoms/rolling-number";
import { EASE_OUT, motionOff } from "@/lib/motion";

/**
 * Medidor semicircular: qué parte de `of` representa `value` (balance sobre
 * ingresos). El arco oro se llena al aparecer; la cifra rueda hasta su valor.
 */
export function GaugeChart({ value, of, ariaLabel }: { value: number; of: number; ariaLabel: string }) {
  const arcRef = useRef<SVGPathElement>(null);
  const ratio = of > 0 ? Math.max(0, Math.min(1, value / of)) : 0;

  useLayoutEffect(() => {
    const arc = arcRef.current;
    if (!arc || motionOff()) return;
    const animation = arc.animate([{ strokeDasharray: "0 100" }, { strokeDasharray: `${ratio * 100} 100` }], { duration: 1000, easing: EASE_OUT, fill: "backwards" });
    return () => animation.cancel();
  }, [ratio]);

  return (
    <div className="relative grid h-full min-h-0 place-items-center">
      <div className="relative w-full max-w-[320px]">
        <svg role="img" aria-label={`${ariaLabel}: ${Math.round(ratio * 100)} %`} viewBox="0 0 100 56" className="block w-full overflow-visible">
          <path d="M10 50 A40 40 0 0 1 90 50" pathLength={100} fill="none" className="stroke-border" strokeWidth={9} strokeLinecap="butt" />
          <path ref={arcRef} d="M10 50 A40 40 0 0 1 90 50" pathLength={100} fill="none" stroke="var(--nx-gold-500)" strokeWidth={9} strokeLinecap="butt" strokeDasharray={`${ratio * 100} 100`} />
        </svg>
        <div className="absolute inset-x-0 bottom-0 grid place-items-center text-center leading-tight">
          <b className="font-display text-[clamp(18px,3.2vw,28px)] font-semibold tabular-nums">
            <RollingNumber value={value} format="cop" />
          </b>
          <span className="text-xs text-muted-foreground">{of > 0 ? `${Math.round(ratio * 100)} % de los ingresos` : "Sin ingresos en el periodo"}</span>
        </div>
      </div>
    </div>
  );
}
