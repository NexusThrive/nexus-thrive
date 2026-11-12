"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/** Cuánto falta por bajar (px) para considerar que ya se llegó al final. */
const NEAR_END = 48;

/**
 * Aviso de «hay más abajo» para un contenedor que se desplaza (su padre, que debe ser `position: relative` y tener scroll): mientras
 * quede contenido por ver, un círculo con una flecha queda centrado abajo; al tocarlo lleva al final. Desaparece solo al llegar abajo o
 * si todo cabe. Va al final del contenedor y se pega al borde inferior de lo visible (sin `z-index`: el orden del documento lo pone encima).
 */
export function ScrollHint({ label = "Ir al final" }: { label?: string }) {
  const marker = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = marker.current?.parentElement;
    if (!el) return;
    const update = () => setMore(el.scrollHeight - el.clientHeight - el.scrollTop > NEAR_END);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // El contenido cambia de alto (carga, filtros, secciones que se abren): se vuelve a medir.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(el);
    for (const child of Array.from(el.children)) if (child !== marker.current) observer?.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, []);

  const goToEnd = () => {
    const el = marker.current?.parentElement;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "instant" : "smooth" });
  };

  return (
    <div ref={marker} className="pointer-events-none sticky bottom-0 flex h-0 justify-center">
      {more ? (
        <button
          type="button"
          onClick={goToEnd}
          aria-label={label}
          title={label}
          className="nx-rise pointer-events-auto absolute bottom-5 grid size-11 place-items-center rounded-full border border-border/60 bg-card text-foreground shadow-[var(--nx-shadow-overlay)] outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronDown aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
