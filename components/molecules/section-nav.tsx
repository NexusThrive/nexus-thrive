"use client";

import { Fragment, useLayoutEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionNavItem<T extends string> = { id: T; label: string; icon: LucideIcon; hint?: string; /** Título del grupo; se muestra donde cambia de un elemento al siguiente. */ group?: string };

/**
 * Navegación de secciones (Ajustes): en escritorio, columna fija a la
 * izquierda donde el fondo del elemento activo viaja con la barra oro, como
 * la barra lateral (NAV·02, 460 ms); en el celular, una fila deslizable de
 * píldoras.
 */
export function SectionNav<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: readonly SectionNavItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const ind = indRef.current;
    if (!list || !ind) return;
    const place = () => {
      const on = list.querySelector<HTMLElement>('[aria-current="page"]');
      if (!on) return;
      ind.style.height = `${on.offsetHeight}px`;
      ind.style.transform = `translateY(${on.offsetTop}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [value]);

  return (
    <>
      <nav aria-label={ariaLabel} className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:hidden">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={item.id === value ? "page" : undefined}
            data-press=""
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm border px-3 text-[13px] font-medium transition-colors",
              item.id === value ? "border-primary bg-primary text-primary-foreground" : "border-border-input text-muted-foreground",
            )}
          >
            <item.icon aria-hidden="true" className="size-4" strokeWidth={1.7} />
            {item.label}
          </button>
        ))}
      </nav>
      <nav aria-label={ariaLabel} className="sticky top-[calc(var(--topbar-height)+16px)] hidden self-start lg:block">
        <div ref={listRef} className="relative grid gap-0.5">
          <span
            ref={indRef}
            aria-hidden="true"
            className="absolute inset-x-0 top-0 z-0 rounded-md bg-surface-muted transition-transform duration-[460ms] ease-[var(--nx-ease-out)] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:bg-accent"
          />
          {items.map((item, i) => (
            <Fragment key={item.id}>
              {item.group && item.group !== items[i - 1]?.group ? <p className={cn("relative z-10 px-3.5 pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground", i > 0 && "mt-3")}>{item.group}</p> : null}
            <button
              type="button"
              aria-current={item.id === value ? "page" : undefined}
              onClick={() => onChange(item.id)}
              className={cn(
                "relative z-10 flex items-center gap-3 rounded-md px-3.5 py-2.5 text-left transition-opacity",
                item.id === value ? "opacity-100" : "text-foreground/90 hover:opacity-100",
              )}
            >
              <item.icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.6} />
              <span className="min-w-0">
                <b className="block text-[13.5px] font-medium">{item.label}</b>
                {item.hint ? <small className="block truncate text-xs text-muted-foreground">{item.hint}</small> : null}
              </span>
            </button>
            </Fragment>
          ))}
        </div>
      </nav>
    </>
  );
}
