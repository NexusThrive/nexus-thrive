"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { N_PATH } from "@/components/atoms/n-path";
import { cn } from "@/lib/utils";

/** Marca por ruta: «esta vista estaba vacía la última vez». La precarga la usa para pintar el esqueleto del estado vacío y no filas. */
const emptyKey = (path: string) => `nexus.vacio:${path}`;

function readEmpty(path: string): boolean {
  try {
    return window.localStorage.getItem(emptyKey(path)) === "1";
  } catch {
    return false;
  }
}

/** ¿La vista de esta ruta estaba vacía la última vez? (sin almacenamiento o en el servidor, `false`). */
export function useRememberedEmpty(): boolean {
  const path = usePathname() ?? "";
  return useSyncExternalStore(
    () => () => {},
    () => readEmpty(path),
    () => false,
  );
}

/**
 * Olvida la marca al cambiar de ruta (efecto de diseño: corre antes de que la vista nueva, si sigue vacía, la vuelva a poner en su
 * efecto). Va una sola vez en el layout raíz.
 */
export function ForgetEmptyOnNavigate() {
  const path = usePathname() ?? "";
  useLayoutEffect(() => {
    try {
      window.localStorage.removeItem(emptyKey(path));
    } catch {
      /* sin almacenamiento: no hay marca */
    }
  }, [path]);
  return null;
}

/** Ocupa el alto que queda hasta el borde de la vista (sin el relleno inferior de `main`): el estado vacío nunca deja scroll. */
function fit(el: HTMLElement) {
  const main = el.closest("main");
  const pad = main ? Number.parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
  const top = el.getBoundingClientRect().top + window.scrollY;
  let height = Math.max(320, Math.floor(window.innerHeight - top - pad));
  el.style.minHeight = `${height}px`;
  // Si algo más (un borde, una tarjeta que lo envuelve, una nota debajo) aún deja scroll, se encoge lo que sobra.
  const overflow = document.documentElement.scrollHeight - window.innerHeight;
  if (overflow > 0) {
    height = Math.max(320, height - overflow);
    el.style.minHeight = `${height}px`;
  }
}

/**
 * Marco del estado vacío de una vista entera: llena el alto disponible, centra el contenido y pone la N de contorno grande, centrada
 * abajo, recortada por el borde y difuminándose. `remember` anota la ruta como vacía para la próxima precarga.
 */
export function EmptyPageFrame({ remember = true, className, children }: { remember?: boolean; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname() ?? "";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    fit(el);
    const onResize = () => fit(el);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!remember) return;
    try {
      window.localStorage.setItem(emptyKey(path), "1");
    } catch {
      /* sin almacenamiento: la precarga muestra la forma de siempre */
    }
  }, [remember, path]);

  return (
    <div ref={ref} className={cn("relative isolate flex min-h-80 flex-col items-center justify-center overflow-hidden px-6 pb-40 pt-12 text-center sm:px-10", className)}>
      <svg
        viewBox="394.83 239.93 734.96 634.25"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 -z-10 w-[min(640px,92vw)] -translate-x-1/2 translate-y-[55%] text-foreground opacity-[0.07]"
        style={{ maskImage: "linear-gradient(to bottom, #000 20%, transparent 85%)", WebkitMaskImage: "linear-gradient(to bottom, #000 20%, transparent 85%)" }}
      >
        <path d={N_PATH} fill="none" stroke="currentColor" strokeWidth={10} strokeLinejoin="round" />
      </svg>
      {children}
    </div>
  );
}
