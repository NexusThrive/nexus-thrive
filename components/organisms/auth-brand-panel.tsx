"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, CircleDollarSign } from "lucide-react";
import { N_PATH } from "@nexus/brand/BrandLogo";
import { CountUp } from "@/components/atoms/count-up";
import { IconTile } from "@/components/atoms/icon-tile";
import { RevealText } from "@/components/atoms/reveal-text";
import { Sparkline } from "@/components/atoms/sparkline";
import { Wordmark } from "@/components/atoms/wordmark";
import type { AuthMode } from "@/components/molecules/auth-mode-switch";
import { Eyebrow } from "@/components/molecules/page-header";
import { EASE_IN_OUT, motionOff } from "@/lib/motion";
import { cn } from "@/lib/utils";
import styles from "./auth-brand-panel.module.css";

const COPY: Record<AuthMode, { eyebrow: string; title: string; text: string }> = {
  "sign-in": {
    eyebrow: "Bienvenido de nuevo",
    title: "Tu negocio te espera donde lo dejaste.",
    text: "Clientes, agenda, finanzas y WhatsApp en un solo sistema operativo.",
  },
  "sign-up": {
    eyebrow: "Empieza hoy",
    title: "Crea tu negocio en NEXUS THRIVE.",
    text: "Configura tu espacio en minutos y crece con orden desde el primer día.",
  },
};

const STEPS = ["Crea tu cuenta", "Agrega tu negocio y servicios", "Conecta WhatsApp y empieza a vender"];

/**
 * Panel de marca del acceso (solo desde 1024 px): la N gigante en contorno con
 * un tramo oro que la recorre, el titular que entra letra por letra y una
 * vista previa del producto que cambia con el modo — ingresos que cuentan y
 * tarjetas flotando al iniciar sesión; los tres pasos que se marcan solos al
 * crear la cuenta.
 */
export function AuthBrandPanel({ mode }: { mode: AuthMode }) {
  const copy = COPY[mode];
  const traceRef = useRef<SVGPathElement>(null);
  const [checked, setChecked] = useState(0);

  useEffect(() => {
    const trace = traceRef.current;
    if (!trace) return;
    if (motionOff()) {
      trace.style.strokeDasharray = "none";
      return;
    }
    const up = mode === "sign-up";
    trace.animate(
      [
        { strokeDasharray: "0 1", strokeDashoffset: up ? 0 : 0.5 },
        { strokeDasharray: ".34 .66", strokeDashoffset: up ? -0.66 : -0.16 },
      ],
      { duration: 1600, easing: EASE_IN_OUT, fill: "forwards" },
    );
  }, [mode]);

  useEffect(() => {
    if (mode !== "sign-up") return;
    const instant = motionOff();
    const timers = STEPS.map((_, i) => window.setTimeout(() => setChecked(i + 1), instant ? 0 : 500 + i * 520));
    return () => {
      timers.forEach(window.clearTimeout);
      setChecked(0);
    };
  }, [mode]);

  return (
    <aside className={styles.panel} aria-label="NEXUS THRIVE">
      <Wordmark size={30} />
      <div className={styles.art} aria-hidden="true">
        <svg viewBox="394.83 239.93 734.96 634.25">
          <path className={styles.outline} d={N_PATH} />
          <path ref={traceRef} className={styles.trace} pathLength={1} d={N_PATH} />
        </svg>
      </div>

      <div className={styles.copy}>
        <Eyebrow className="mb-0">
          <RevealText key={`e-${mode}`} parts={[copy.eyebrow]} />
        </Eyebrow>
        <RevealText key={`t-${mode}`} as="h1" parts={[copy.title]} />
        <p key={`p-${mode}`} className="nx-rise">{copy.text}</p>
      </div>

      <div className={styles.stage} aria-hidden="true">
        {mode === "sign-in" ? (
          <div key="in" className={cn(styles.preview, styles.enter)}>
            <div className={cn(styles.card, styles.float, "w-[78%]")}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 leading-tight">
                  <small className="text-xs text-muted-foreground">Ingresos de hoy</small>
                  <p className="font-display text-[26px] font-bold tabular-nums tracking-[-0.015em]">
                    <CountUp value={2480000} duration={1100} format="cop" />
                  </p>
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-success">
                  <ArrowUpRight className="size-4" />
                  12%
                </span>
              </div>
              <Sparkline values={[8, 12, 10, 20, 16, 26, 22, 32, 28, 36, 34]} color="var(--nx-gold-600)" className="mt-1.5 h-[42px]" />
            </div>
            <div className={cn(styles.card, styles.float, styles.float2, "ml-[22%] w-[72%]")}>
              <div className="flex items-center gap-3">
                <IconTile tone="success" size="sm"><CircleDollarSign /></IconTile>
                <div className="min-w-0 leading-tight">
                  <b className="block font-semibold">Pago recibido</b>
                  <small className="text-xs text-muted-foreground">Laura Gómez · $ 180.000</small>
                </div>
              </div>
            </div>
            <div className={cn(styles.card, styles.float, styles.float3, "ml-[6%] w-[52%]")}>
              <div className="flex items-center gap-3">
                <IconTile tone="gold" size="sm"><CalendarDays /></IconTile>
                <div className="min-w-0 leading-tight">
                  <b className="block font-semibold">3 citas hoy</b>
                  <small className="text-xs text-muted-foreground">Próxima 10:30</small>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div key="up" className={cn(styles.preview, styles.enter)}>
            <div className={cn(styles.card, styles.float, "w-[84%]")}>
              <small className="text-xs text-muted-foreground">Tu negocio en tres pasos</small>
              <ul className={styles.checks}>
                {STEPS.map((step, i) => (
                  <li key={step} data-on={i < checked ? "" : undefined}>
                    <span className={styles.box}>
                      <svg viewBox="0 0 12 12"><path pathLength={20} d="M2.5 6.2l2.4 2.4 4.6-5" /></svg>
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <div className={cn(styles.float, styles.float2, "ml-[10%] flex flex-wrap items-center gap-1.5 text-[12.5px]")}>
              {["Clientes", "Agenda", "Finanzas"].map((label, i) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1">
                  <b className="font-mono text-[11px] font-semibold text-accent-text">0{i + 1}</b>
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-3 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} NEXUS THRIVE</span>
        <span>nexusthrive.com.co</span>
      </div>
    </aside>
  );
}
