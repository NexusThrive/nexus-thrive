"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
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
 * botones «Siguiente» y «Omitir». El tamaño y la cara de AURI los maneja `AuriAssistant`; esto solo es lo que habla. Un lector de
 * pantalla recibe la frase completa de una vez (`aria-live`), no letra a letra.
 */
export function AuriHomeIntroCard({ steps, index, onNext, onSkip }: { steps: ReturnType<typeof homeIntroSteps>; index: number; onNext: () => void; onSkip: () => void }) {
  const step = steps[index]!;
  const typed = useTyped(step.text);
  const last = index === steps.length - 1;
  return (
    <section
      aria-label="AURI te muestra tu panel de inicio"
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px)+104px)] right-4 z-(--z-sticky) w-[min(340px,calc(100vw-32px))] rounded-2xl rounded-br-md border border-border bg-foreground p-4 text-background shadow-(--shadow-popover) md:bottom-[calc(24px+104px)] md:right-6"
    >
      <p className="sr-only" aria-live="polite">
        {step.text}
      </p>
      <p aria-hidden="true" className="min-h-[3.75rem] text-ui leading-relaxed">
        {typed}
        <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-current motion-reduce:animate-none" />
      </p>
      <div className="mt-3 flex items-center gap-3">
        <ol aria-hidden="true" className="flex flex-1 gap-1">
          {steps.map((s, i) => (
            <li key={s.text} className={cn("h-1 flex-1 rounded-full bg-background/25", i <= index && "bg-accent")} />
          ))}
        </ol>
        <span className="text-xs tabular-nums opacity-70">
          {index + 1} de {steps.length}
        </span>
        {last ? null : (
          <button type="button" onClick={onSkip} className="rounded-md px-2 py-1 text-xs font-medium opacity-80 outline-none hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent pointer-coarse:min-h-11">
            Omitir
          </button>
        )}
        <button type="button" onClick={last ? onSkip : onNext} autoFocus className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-ui font-semibold text-ink outline-none hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background pointer-coarse:min-h-11">
          {last ? "Entendido" : "Siguiente"}
          {last ? null : <ArrowRight aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </section>
  );
}
