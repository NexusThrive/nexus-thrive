"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
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
 * `preview`, detrás van datos de ejemplo (cómo se verá la lista con datos) que llenan hasta abajo y se difuminan por debajo del
 * contenido. `remember` anota la ruta como vacía para la próxima precarga.
 */
export function EmptyPageFrame({ remember = true, preview, className, children }: { remember?: boolean; preview?: EmptyPreview; className?: string; children: ReactNode }) {
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
      {preview ? <SampleTable preview={preview} /> : null}
      {children}
    </div>
  );
}

/** Datos de ejemplo de una vista vacía: columnas y filas tal como se verían con datos (la primera columna lleva avatar). */
export type EmptyPreview = { columns: string[]; rows: string[][] };

/**
 * Datos de ejemplo detrás del estado vacío: la tabla como se verá con datos (encabezado y filas de 38 px, con la cara de cada
 * cliente —su blobatar— en la primera columna), desenfocada. Decorativa (`aria-hidden`, sin foco ni clics), detrás del contenido; se desvanece hacia el centro (donde va
 * el texto) y hacia abajo. En celular solo se ven las dos primeras columnas.
 */
function SampleTable({ preview }: { preview: EmptyPreview }) {
  const hide = (i: number) => (i >= 4 ? "hidden lg:block" : i >= 2 ? "hidden sm:block" : "");
  return (
    <div
      aria-hidden="true"
      inert
      className="pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden text-left"
      style={{
        maskImage: "radial-gradient(ellipse 52% 48% at 50% 52%, transparent 0%, rgba(0,0,0,.25) 50%, rgba(0,0,0,.8) 100%), linear-gradient(to bottom, #000 10%, transparent 92%)",
        WebkitMaskImage: "radial-gradient(ellipse 52% 48% at 50% 52%, transparent 0%, rgba(0,0,0,.25) 50%, rgba(0,0,0,.8) 100%), linear-gradient(to bottom, #000 10%, transparent 92%)",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
        filter: "blur(1.5px)",
        opacity: 0.45,
      }}
    >
      <div className="grid h-[38px] grid-cols-[2fr_repeat(4,1fr)] items-center gap-6 border-b border-border px-5 text-xs font-medium text-muted-foreground max-lg:grid-cols-[2fr_repeat(3,1fr)] max-sm:grid-cols-[2fr_1fr]">
        {preview.columns.map((c, i) => (
          <span key={c} className={cn("truncate", hide(i))}>
            {c}
          </span>
        ))}
      </div>
      {preview.rows.map((row, r) => (
        <div key={r} className="grid h-[38px] grid-cols-[2fr_repeat(4,1fr)] items-center gap-6 border-b border-border/60 px-5 text-sm text-muted-foreground max-lg:grid-cols-[2fr_repeat(3,1fr)] max-sm:grid-cols-[2fr_1fr]">
          {row.map((cell, i) =>
            i === 0 ? (
              <span key={i} className="flex min-w-0 items-center gap-2.5 text-foreground">
                <CustomerAvatar identity={{ name: cell }} className="size-6 rounded-md" />
                <span className="truncate">{cell}</span>
              </span>
            ) : (
              <span key={i} className={cn("truncate tabular-nums", hide(i))}>
                {cell}
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}
