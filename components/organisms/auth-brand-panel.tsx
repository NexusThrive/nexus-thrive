"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, CircleDollarSign } from "lucide-react";
import { CountUp } from "@/components/atoms/count-up";
import { EyeTracker, type EyeMood } from "@/components/atoms/eye-tracker";
import { IconTile } from "@/components/atoms/icon-tile";
import { Sparkline } from "@/components/atoms/sparkline";
import type { AuthMode } from "@/components/molecules/auth-mode-switch";
import { motionOff } from "@/lib/experience/motion/index";
import { cn } from "@/lib/utils";
import styles from "./auth-brand-panel.module.css";

/** Lo que AURI dice en cada paso, la cara que pone y qué tarjeta abre (si abre una). */
type Step = { text: string; mood: EyeMood; open?: "income" | "payment" | "agenda" | "step1" | "step2" | "step3" };

const SCRIPT: Record<AuthMode, Step[]> = {
  "sign-in": [
    { text: "¡Hola de nuevo! Qué bueno verte por aquí.", mood: "joy" },
    { text: "Mira cómo va tu día hasta ahora…", mood: "curious", open: "income" },
    { text: "¡Acaba de entrar un pago de Laura Gómez!", mood: "surprise", open: "payment" },
    { text: "Y tienes 3 citas hoy. La primera es a las 10:30.", mood: "think", open: "agenda" },
    { text: "Inicia sesión y seguimos justo donde lo dejaste.", mood: "wink" },
  ],
  "sign-up": [
    { text: "¡Hola! Soy AURI y te ayudo a empezar.", mood: "joy" },
    { text: "Primero, crea tu cuenta. Son 15 días gratis y sin tarjeta.", mood: "wink", open: "step1" },
    { text: "Después agregas tu negocio y tus servicios.", mood: "curious", open: "step2" },
    { text: "Y yo conecto tu WhatsApp para que empieces a vender.", mood: "surprise", open: "step3" },
    { text: "¿Listo? Regístrate y arrancamos.", mood: "joy" },
  ],
};

const TYPE_MS = 28;
const HOLD_MS = 1300;

/**
 * El guion de AURI: escribe cada frase letra a letra (hablando), pone su cara, y al terminar la frase abre la tarjeta que corresponde. Se
 * reinicia al cambiar entre iniciar sesión y registrarse, y se queda en la última frase (sin repetirse en bucle). Con movimiento reducido
 * muestra todo de una vez.
 */
function useAuriScript(mode: AuthMode) {
  const steps = SCRIPT[mode];
  const [state, setState] = useState({ mode, index: 0, typed: 0, done: false });
  // Al cambiar de modo el guion vuelve al principio (se ajusta durante el render, sin efecto).
  if (state.mode !== mode) setState({ mode, index: 0, typed: 0, done: false });

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    if (motionOff()) {
      // Movimiento reducido: todo de una vez, con la última frase a la vista.
      later(() => setState({ mode, index: steps.length - 1, typed: steps.at(-1)!.text.length, done: true }), 0);
      return () => {
        cancelled = true;
        timers.forEach(window.clearTimeout);
      };
    }
    const play = (index: number) => {
      const text = steps[index]!.text;
      setState({ mode, index, typed: 0, done: false });
      for (let k = 1; k <= text.length; k++) later(() => setState((s) => (s.mode === mode && s.index === index ? { ...s, typed: k } : s)), 350 + k * TYPE_MS);
      const end = 350 + text.length * TYPE_MS;
      later(() => setState((s) => (s.mode === mode && s.index === index ? { ...s, done: true } : s)), end);
      if (index < steps.length - 1) later(() => play(index + 1), end + HOLD_MS);
    };
    play(0);
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [mode, steps]);

  const step = steps[Math.min(state.index, steps.length - 1)]!;
  // Las tarjetas que ya se abrieron (cada una queda abierta cuando AURI termina la frase que la presenta).
  const opened = new Set<string>();
  steps.forEach((s, i) => {
    if (s.open && (i < state.index || (i === state.index && state.typed >= 1))) opened.add(s.open);
  });
  return { text: step.text.slice(0, state.typed), mood: step.mood, speaking: !state.done, opened, index: state.index };
}

/**
 * Panel de marca del acceso (solo desde 1024 px): AURI, grande y con vida, te habla según estés iniciando sesión o registrándote, cambia
 * de cara con lo que dice y va abriendo las tarjetas de lo que verás dentro (ingresos, un pago, las citas; o los tres pasos para empezar).
 */
export function AuthBrandPanel({ mode }: { mode: AuthMode }) {
  const { text, mood, speaking, opened } = useAuriScript(mode);
  const signIn = mode === "sign-in";

  return (
    <aside className={styles.panel} aria-label="NEXUS THRIVE">
     {/* Un cuadro redondeado, despegado de las esquinas, con su propio fondo animado; adentro, AURI. */}
     <div className={styles.frame}>
      <span className={styles.fx} aria-hidden="true">
        <i className={styles.blobA} />
        <i className={styles.blobB} />
        <i className={styles.dots} />
      </span>
      <h1 className="sr-only">{signIn ? "Bienvenido de nuevo a NEXUS THRIVE" : "Crea tu negocio en NEXUS THRIVE"}</h1>

      <div className={styles.hero} aria-hidden="true">
        <div className={styles.auri}>
          <span className={styles.halo2} />
          <span className={styles.halo1} />
          <EyeTracker fit decorative poke={false} follow={60} size={152} shape="Ball" eyeScale={1.2} mood={mood} speaking={speaking} />
        </div>

        <p className={styles.bubble}>
          <span>{text}</span>
          <span className={cn(styles.caret, !speaking && styles.caretIdle)} />
        </p>

        <div className={styles.cards}>
          {signIn ? (
            <>
              {opened.has("income") ? (
                <div key="income" className={cn(styles.card, styles.open)}>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1 leading-tight">
                      <small className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-success" />
                        Ingresos de hoy
                      </small>
                      <p className="font-display text-[26px] font-semibold tabular-nums tracking-[-0.015em]">
                        <CountUp value={2480000} duration={1100} format="cop" />
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-success">
                      <ArrowUpRight className="size-4" />
                      12%
                    </span>
                  </div>
                  <Sparkline values={[8, 12, 10, 20, 16, 26, 22, 32, 28, 36, 34]} color="var(--nx-gold-600)" className="mt-1.5 h-[38px]" />
                </div>
              ) : null}
              <div className={styles.row}>
                {opened.has("payment") ? (
                  <div key="payment" className={cn(styles.card, styles.open)}>
                    <div className="flex items-center gap-3">
                      <IconTile tone="success" size="sm"><CircleDollarSign /></IconTile>
                      <div className="min-w-0 leading-tight">
                        <b className="block font-semibold">Pago recibido</b>
                        <small className="text-xs text-muted-foreground">Laura Gómez · $ 180.000</small>
                      </div>
                    </div>
                  </div>
                ) : null}
                {opened.has("agenda") ? (
                  <div key="agenda" className={cn(styles.card, styles.open)}>
                    <div className="flex items-center gap-3">
                      <IconTile tone="gold" size="sm"><CalendarDays /></IconTile>
                      <div className="min-w-0 leading-tight">
                        <b className="block font-semibold">3 citas hoy</b>
                        <small className="text-xs text-muted-foreground">Próxima 10:30</small>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className={cn(styles.card, opened.size > 0 && styles.open)} style={{ opacity: opened.size > 0 ? undefined : 0 }}>
              <small className="text-xs text-muted-foreground">Tu negocio en tres pasos</small>
              <ul className={styles.checks}>
                {[
                  ["step1", "Crea tu cuenta"],
                  ["step2", "Agrega tu negocio y servicios"],
                  ["step3", "Conecta WhatsApp y empieza a vender"],
                ].map(([key, label]) => (
                  <li key={key} data-on={opened.has(key!) ? "" : undefined}>
                    <span className={styles.box}>
                      <svg viewBox="0 0 12 12"><path pathLength={20} d="M2.5 6.2l2.4 2.4 4.6-5" /></svg>
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      
     </div>
    </aside>
  );
}
