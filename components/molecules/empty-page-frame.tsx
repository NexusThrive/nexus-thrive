"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
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

/**
 * Ocupa el alto que queda hasta el borde inferior de la ventana —incluido el relleno de `main`, que se compensa con un margen
 * negativo para no dejar scroll—: la N y su difuminado llegan de verdad hasta abajo.
 */
function fit(el: HTMLElement) {
  const main = el.closest("main");
  const pad = main ? Number.parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
  const top = el.getBoundingClientRect().top + window.scrollY;
  el.style.marginBottom = pad > 0 ? `-${pad}px` : "";
  let height = Math.max(320, Math.floor(window.innerHeight - top));
  el.style.minHeight = `${height}px`;
  // Si algo más (un borde, una tarjeta que lo envuelve, una nota debajo) aún deja scroll, se encoge lo que sobra.
  const overflow = document.documentElement.scrollHeight - window.innerHeight;
  if (overflow > 0) {
    height = Math.max(320, height - overflow);
    el.style.minHeight = `${height}px`;
  }
}

/**
 * Marco del estado vacío de una vista entera: llena el alto disponible (sin dejar scroll) y centra el contenido. Con
 * `preview="table"`, detrás va una tabla fantasma (cómo se verá la lista con datos) que llena hasta abajo y se difumina por
 * debajo del contenido. `remember` anota la ruta como vacía para la próxima precarga.
 */
export function EmptyPageFrame({ remember = true, preview, className, children }: { remember?: boolean; preview?: "table"; className?: string; children: ReactNode }) {
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
    <div ref={ref} className={cn("relative isolate flex min-h-80 flex-col items-center justify-center overflow-hidden px-6 py-12 text-center sm:px-10", className)}>
      {preview === "table" ? <GhostTable /> : null}
      {children}
    </div>
  );
}

/** Filas de muestra (anchos fijos, sin aleatoriedad: el servidor y el navegador pintan lo mismo). */
const GHOST_ROWS = [62, 48, 70, 55, 66, 44, 58, 72, 50, 64, 46, 68, 53, 60, 49, 67, 57, 63, 45, 69, 52, 61];

/**
 * Vista previa fantasma de una lista: encabezado y filas de 38 px con casilla, avatar y columnas, en tonos de borde. Decorativa
 * (`aria-hidden`), detrás del contenido; se desvanece hacia el centro (donde va el texto) y hacia abajo.
 */
function GhostTable() {
  const bar = "h-2.5 rounded-sm bg-border";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden text-left"
      style={{
        maskImage: "radial-gradient(ellipse 46% 42% at 50% 52%, transparent 0%, rgba(0,0,0,.35) 55%, #000 100%), linear-gradient(to bottom, #000 30%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 46% 42% at 50% 52%, transparent 0%, rgba(0,0,0,.35) 55%, #000 100%), linear-gradient(to bottom, #000 30%, transparent 100%)",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
        opacity: 0.75,
      }}
    >
      <div className="flex h-[38px] items-center gap-6 border-b border-border px-5">
        <span className="size-3.5 shrink-0 rounded-sm border border-border" />
        <span className={cn(bar, "w-[14%]")} />
        <span className={cn(bar, "w-[12%]")} />
        <span className={cn(bar, "w-[10%]")} />
        <span className={cn(bar, "hidden w-[9%] sm:block")} />
        <span className={cn(bar, "hidden w-[8%] md:block")} />
      </div>
      {GHOST_ROWS.map((w, i) => (
        <div key={i} className="flex h-[38px] items-center gap-6 border-b border-border/60 px-5">
          <span className="size-3.5 shrink-0 rounded-sm border border-border" />
          <span className="flex w-[22%] items-center gap-2.5">
            <span className="size-6 shrink-0 rounded-md bg-border" />
            <span className={bar} style={{ width: `${w}%` }} />
          </span>
          <span className={bar} style={{ width: `${8 + (w % 7)}%` }} />
          <span className={bar} style={{ width: `${7 + (w % 5)}%` }} />
          <span className={cn(bar, "hidden sm:block")} style={{ width: `${6 + (w % 4)}%` }} />
          <span className={cn(bar, "hidden md:block")} style={{ width: `${5 + (w % 3)}%` }} />
        </div>
      ))}
    </div>
  );
}
