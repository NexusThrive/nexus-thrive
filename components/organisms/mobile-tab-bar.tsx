"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, LayoutGrid, Plus, Search } from "lucide-react";
import { IconTile } from "@/components/atoms/icon-tile";
import { useShell } from "@/components/providers/shell-context";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { QuickCreateGrid } from "./quick-create-grid";
import { ResponsiveSheet } from "./responsive-sheet";

const PRIMARY_SLOTS = 3;

/**
 * Barra inferior en móvil (< 768 px): tres secciones principales, el botón
 * central "Crear" (abre las acciones rápidas) y "Más" con el resto. Un corte
 * oro marca la sección activa y se desliza entre pestañas; el icono activo da
 * un saltito. Se esconde al bajar y vuelve al subir.
 */
export function MobileTabBar() {
  const { groups, activeKey, hrefFor, quickActions, openSearch, onNavigate } = useShell();
  const barRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [hidden, setHidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const items = groups.flatMap((g) => g.items);
  const primary = items.filter((i) => i.key !== "settings").slice(0, PRIMARY_SLOTS);
  const rest = items.filter((i) => !primary.includes(i));
  const moreActive = !!activeKey && !primary.some((i) => i.key === activeKey);
  const [first, second, third] = primary;

  useLayoutEffect(() => {
    const bar = barRef.current;
    const indicator = indicatorRef.current;
    if (!bar || !indicator) return;
    const place = () => {
      const tab = bar.querySelector<HTMLElement>('[aria-current="page"]');
      if (!tab) {
        indicator.style.opacity = "0";
        return;
      }
      const width = Math.min(28, tab.offsetWidth * 0.4);
      indicator.style.opacity = "1";
      indicator.style.width = `${width}px`;
      indicator.style.transform = `translateX(${tab.offsetLeft + (tab.offsetWidth - width) / 2}px)`;
      spring(tab.querySelector("svg"), "y", -7, 0, { stiffness: 520, damping: 13 });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [activeKey]);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > 90 && y - last > 6) setHidden(true);
        else if (last - y > 6 || y < 40) setHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tabClass =
    "relative flex h-[54px] flex-col items-center justify-center gap-[3px] rounded-md text-[11px] font-medium text-muted-foreground transition-colors duration-200 aria-[current=page]:text-foreground [&_svg]:size-[18px]";

  const tab = (item: (typeof primary)[number] | undefined) =>
    item ? (
      <Link
        key={item.key}
        href={hrefFor(item.href)}
        aria-current={item.key === activeKey ? "page" : undefined}
        onClick={onNavigate ? (event) => onNavigate(item, event) : undefined}
        data-press=""
        className={tabClass}
      >
        <item.icon aria-hidden="true" strokeWidth={1.6} />
        <span className="max-w-full truncate px-1">{item.label}</span>
      </Link>
    ) : (
      <span />
    );

  return (
    <>
      <nav
        data-mobile-tabbar=""
        ref={barRef}
        aria-label="Navegación"
        className={cn(
          "fixed inset-x-0 bottom-0 z-45 grid grid-cols-5 items-end border-t border-border bg-glass px-[max(8px,env(safe-area-inset-right,0px))] pb-[calc(6px+env(safe-area-inset-bottom,0px))] pt-1.5 backdrop-blur-[16px] backdrop-saturate-[1.4] transition-transform duration-[320ms] ease-[var(--nx-ease-out)] md:hidden",
          hidden && "translate-y-[calc(100%+8px)]",
        )}
      >
        <span
          ref={indicatorRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-[3px] w-[22px] bg-accent opacity-0 transition-[transform,width,opacity] duration-[420ms] ease-[var(--nx-ease-out)] [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)]"
        />
        {tab(first)}
        {tab(second)}
        <button
          type="button"
          aria-label={quickActions.length ? "Crear" : "Buscar"}
          aria-expanded={quickActions.length ? createOpen : undefined}
          onClick={() => (quickActions.length ? setCreateOpen(true) : openSearch())}
          data-press=""
          className="mb-1.5 grid size-14 place-items-center justify-self-center rounded-[6px] bg-primary text-primary-foreground shadow-[0_6px_18px_rgba(0,0,0,.22)]"
        >
          {quickActions.length ? (
          <Plus
            aria-hidden="true"
            className={cn("size-6 transition-transform duration-[320ms] ease-[var(--nx-ease-out)]", createOpen && "rotate-[135deg]")}
          />
          ) : (
            <Search aria-hidden="true" className="size-6" />
          )}
        </button>
        {tab(third)}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-current={moreActive ? "page" : undefined}
          data-press=""
          className={tabClass}
        >
          <LayoutGrid aria-hidden="true" strokeWidth={1.6} />
          <span>Más</span>
        </button>
      </nav>

      <ResponsiveSheet open={createOpen} onOpenChange={setCreateOpen} title="Crear" description="¿Qué quieres registrar?">
        <QuickCreateGrid onNavigate={() => setCreateOpen(false)} />
      </ResponsiveSheet>

      <ResponsiveSheet open={moreOpen} onOpenChange={setMoreOpen} title="Más">
        <div className="grid gap-2">
          {rest.map((item) => (
            <Link
              key={item.key}
              href={hrefFor(item.href)}
              aria-current={item.key === activeKey ? "page" : undefined}
              onClick={(event) => {
                setMoreOpen(false);
                onNavigate?.(item, event);
              }}
              data-press="card"
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-surface-muted aria-[current=page]:border-accent"
            >
              <IconTile>
                <item.icon />
              </IconTile>
              <span className="flex-1 font-medium">{item.label}</span>
              <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </ResponsiveSheet>
    </>
  );
}
