"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/molecules/popover";
import { cn } from "@/lib/utils";
import styles from "./product-tour.module.css";

export type TourStep = {
  /** Selectores CSS; se usa el primero visible (permite una pieza distinta en móvil y en escritorio). */
  target: string[];
  title: string;
  body: string;
  side?: "top" | "right" | "bottom" | "left";
};

function findTarget(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
    }
  }
  return null;
}

/**
 * Recorrido guiado por la interfaz real (no una maqueta): resalta una pieza a la vez y explica para qué sirve. El resaltado
 * viaja de una pieza a la siguiente (como una transición de vista) y la tarjeta lo acompaña. Es un `Popover` anclado a la
 * pieza: Escape o un clic fuera cierran el recorrido; el foco vuelve a la página. Los pasos sin pieza visible (por ejemplo
 * la barra lateral en móvil) se saltan. Con movimiento reducido, el resaltado cambia sin desplazarse.
 */
export function ProductTour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: (completed: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const available = useMemo(() => (open ? steps.filter((s) => findTarget(s.target)) : []), [open, steps]);
  const step = available[index];

  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = findTarget(step.target);
    targetRef.current = el;
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cada apertura empieza desde el primer paso
    if (open) setIndex(0);
  }, [open]);

  if (!open || !step || !rect) return null;

  const pad = 6;
  const spot: CSSProperties = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
  const last = index === available.length - 1;
  const virtualRef = { current: { getBoundingClientRect: () => targetRef.current?.getBoundingClientRect() ?? rect } };

  return (
    <>
      <div aria-hidden="true" className={styles.spot} style={spot} />
      <Popover open onOpenChange={(o) => (o ? null : onClose(false))}>
        <PopoverAnchor virtualRef={virtualRef} />
        <PopoverContent
          side={step.side ?? "bottom"}
          align="start"
          sideOffset={14}
          collisionPadding={12}
          data-nx-tour=""
          aria-label={`Recorrido: ${step.title}`}
          className="w-[min(340px,calc(100vw-24px))] p-4"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div key={index} className={styles.card}>
            <div className="flex items-start gap-3">
              <p className="flex-1 font-mono text-2xs font-semibold uppercase tracking-[0.14em] text-accent-text">{`${index + 1} de ${available.length}`}</p>
              <button type="button" onClick={() => onClose(false)} aria-label="Cerrar recorrido" className="-m-1 grid size-8 pointer-coarse:size-11 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground">
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <h2 className="mt-1 font-display text-base font-semibold text-foreground">{step.title}</h2>
            <p className="mt-1 text-ui text-muted-foreground">{step.body}</p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <ol aria-hidden="true" className="flex flex-1 gap-1">
              {available.map((s, i) => (
                <li key={s.title} className={cn(styles.dot, i === index && styles.dotOn)} />
              ))}
            </ol>
            {index > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setIndex(index - 1)} aria-label="Paso anterior">
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
            <Button variant="accent" size="sm" autoFocus onClick={() => (last ? onClose(true) : setIndex(index + 1))}>
              {last ? "Empezar" : "Siguiente"}
              {last ? null : <ArrowRight aria-hidden="true" className="size-4" />}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
