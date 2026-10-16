"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/* --- 3 · Barra de ruta ---------------------------------------------------- */
export function RouteBar() {
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

  useEffect(() => {
    if (phase !== "loading") return;
    // Diferido a rAF para no encadenar renders dentro del efecto.
    const raf = requestAnimationFrame(() => setPhase("finishing"));
    const timer = setTimeout(() => setPhase("idle"), reduce ? 200 : 520);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [pathname, phase, reduce]);

  if (phase === "idle") return null;

  const finishing = phase === "finishing";

  return (
    <div
      className="nx-strip fixed inset-x-0 top-14 z-[70]"
      role="progressbar"
      aria-label="Cargando página"
    >
      <i
        className={cn("nx-bar", !finishing && "ind")}
        style={
          finishing
            ? { width: "100%", transition: "width .3s ease, opacity .4s ease" }
            : undefined
        }
      />
    </div>
  );
}
