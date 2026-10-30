"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/* --- 3 · Barra de ruta ---------------------------------------------------- */
/** `className` permite anclarla dentro de la barra superior. */
export function RouteBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "loading" | "finishing">("idle");
  const reduce = useReducedMotion();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      setPhase("loading");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // La ruta nueva llegó: la barra se llena. Diferido a rAF para no encadenar renders dentro del efecto.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase((p) => (p === "loading" ? "finishing" : p)));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  // Llena, se desvanece y se quita; si la ruta no cambia nunca, no se queda colgada.
  useEffect(() => {
    if (phase === "idle") return;
    const timer = setTimeout(
      () => setPhase("idle"),
      phase === "finishing" ? (reduce ? 200 : 640) : 15000,
    );
    return () => clearTimeout(timer);
  }, [phase, reduce]);

  if (phase === "idle") return null;

  const finishing = phase === "finishing";

  return (
    <div
      className={cn("nx-strip fixed inset-x-0 top-14 z-(--z-banner)", className)}
      style={
        finishing
          ? { opacity: 0, transition: reduce ? "none" : "opacity .28s ease-out .3s" }
          : { opacity: 1 }
      }
      role="progressbar"
      aria-label="Cargando página"
    >
      <i
        className={cn("nx-bar", !finishing && "ind")}
        style={
          finishing
            ? { width: "100%", transition: "width .3s ease" }
            : undefined
        }
      />
    </div>
  );
}
