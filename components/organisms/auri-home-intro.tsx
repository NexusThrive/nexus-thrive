"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { homeIntroSteps } from "@/lib/experience/assistant/home-intro";
import { cn } from "@/lib/utils";

/** Texto escrito letra a letra (como la burbuja de AURI); sin animación de escritura con movimiento reducido. */
function useTyped(text: string) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let k = 0;
    const id = window.setInterval(() => {
      k = reduced ? text.length : k + 1;
      setTyped(text.slice(0, k));
      if (k >= text.length) window.clearInterval(id);
    }, 26);
    return () => window.clearInterval(id);
  }, [text]);
  return typed;
}

/**
 * Tarjeta de AURI en su esquina durante el recorrido del Inicio: lo que dice (escrito letra a letra), un indicador de paso y los
 * botones «Siguiente» y «Omitir», en una tarjeta suave (blanca, con el paso en píldora). El tamaño y la cara de AURI los maneja `AuriAssistant`; esto solo es lo que habla. Un lector de
 * pantalla recibe la frase completa de una vez (`aria-live`), no letra a letra.
 */
export function AuriHomeIntroCard({ steps, index, onNext, onSkip, anchor }: { steps: ReturnType<typeof homeIntroSteps>; index: number; onNext: () => void; onSkip: () => void; /** Con la AURI grande del Inicio, la tarjeta se pega debajo de ella; sin ancla va en la esquina. */ anchor?: { top: number; left: number } | null }) {
  const step = steps[index]!;
  const typed = useTyped(step.text);
  const last = index === steps.length - 1;
  return (
    <section
      aria-label="AURI te muestra tu panel de inicio"
      style={anchor ? { top: anchor.top, left: anchor.left } : undefined}
      className={cn("fixed z-(--z-sticky) grid w-[min(360px,calc(100vw-32px))] gap-4 rounded-3xl border border-border/60 bg-card p-5 text-card-foreground shadow-(--shadow-popover)", anchor ? "rounded-tr-lg" : "bottom-[calc(76px+env(safe-area-inset-bottom,0px)+104px)] right-4 rounded-br-lg md:bottom-[calc(24px+104px)] md:right-6")}
    >
      <header className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent-text">
          <Sparkles className="size-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-ui font-semibold leading-tight">AURI</p>
          <p className="text-xs text-muted-foreground">Te muestro tu panel</p>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {index + 1} de {steps.length}
        </span>
      </header>
      <p className="sr-only" aria-live="polite">
        {step.text}
      </p>
      <p aria-hidden="true" className="min-h-[3.75rem] rounded-2xl bg-surface-muted/60 px-4 py-3 text-ui leading-relaxed">
        {typed}
        <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-current motion-reduce:animate-none" />
      </p>
      <ol aria-hidden="true" className="flex gap-1.5">
        {steps.map((s, i) => (
          <li key={s.text} className={cn("h-1.5 flex-1 rounded-full bg-surface-muted", i <= index && "bg-accent")} />
        ))}
      </ol>
      <div className="flex items-center justify-end gap-2">
        {last ? null : (
          <button type="button" onClick={onSkip} className="h-11 rounded-full px-4 text-ui font-medium text-muted-foreground outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Omitir
          </button>
        )}
        <button type="button" onClick={last ? onSkip : onNext} autoFocus className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-6 text-ui font-semibold text-ink outline-none transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {last ? "Entendido" : "Siguiente"}
          {last ? null : <ArrowRight aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </section>
  );
}
