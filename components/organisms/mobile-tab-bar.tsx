"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { IconTile } from "@/components/atoms/icon-tile";
import { setTheme, useTheme } from "@/components/atoms/theme-toggle";
import { AccountButton } from "@/components/molecules/account-button";
import { useShell } from "@/components/providers/shell-context";
import { spring } from "@/lib/experience/motion/index";
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
export function MobileTabBar({ accountExtra }: { accountExtra?: React.ReactNode }) {
  const { groups, activeKey, hrefFor, quickActions, openSearch, onNavigate, brandName, title } = useShell();
  const dark = useTheme() === "dark";
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
    "relative flex h-[54px] flex-col items-center justify-center gap-[3px] rounded-md text-2xs font-medium text-muted-foreground transition-colors duration-200 aria-[current=page]:text-foreground [&_svg]:size-[18px]";

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
        data-tour="nav-mobile"
        ref={barRef}
        aria-label="Navegación"
        className={cn(
          "fixed inset-x-0 bottom-0 z-(--z-tabbar) grid grid-cols-5 items-end border-t border-border bg-glass px-[max(8px,env(safe-area-inset-right,0px))] pb-[calc(6px+env(safe-area-inset-bottom,0px))] pt-1.5 backdrop-blur-[16px] backdrop-saturate-[1.4] transition-transform duration-[320ms] ease-[var(--nx-ease-out)] md:hidden",
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
          <Menu aria-hidden="true" strokeWidth={1.6} />
          <span>Más</span>
        </button>
      </nav>

      <ResponsiveSheet open={createOpen} onOpenChange={setCreateOpen} title="Crear" description="¿Qué quieres registrar?">
        <QuickCreateGrid onNavigate={() => setCreateOpen(false)} />
      </ResponsiveSheet>

      <ResponsiveSheet open={moreOpen} onOpenChange={setMoreOpen} title="Más">
        {/* Tu negocio, tu plan, tu cuenta y la apariencia: tarjetas separadas con su título. */}
        <div className="mb-5 grid gap-4">
          <section aria-labelledby="more-business" className="grid gap-1.5">
            <h3 id="more-business" className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Tu negocio</h3>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-muted">
              <div className="flex items-center gap-3 px-3.5 py-3">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-md bg-ink font-display text-base font-bold text-accent">
                  {brandName.trim().charAt(0).toUpperCase() || "N"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-semibold">{brandName}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <i aria-hidden="true" className="inline-block size-1.5 shrink-0 -skew-x-[24deg] bg-accent" />
                    <span className="truncate">Estás en <b className="font-semibold text-foreground">{title}</b></span>
                  </span>
                </span>
              </div>
              {accountExtra}
            </div>
          </section>

          <section aria-labelledby="more-account" className="grid gap-1.5">
            <h3 id="more-account" className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Tu cuenta</h3>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-muted">
              <div className="flex min-h-14 items-center gap-3 px-3.5 py-2">
                <AccountButton showName />
              </div>
              <button
                type="button"
                onClick={() => setTheme(dark ? "light" : "dark")}
                aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                data-press=""
                className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface text-foreground ring-1 ring-border">
                  {dark ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-ui font-semibold">Apariencia</span>
                  <span className="block text-xs text-muted-foreground">{dark ? "Modo oscuro · pasar a claro" : "Modo claro · pasar a oscuro"}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </section>
        </div>
        {rest.length ? <h3 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Secciones</h3> : null}
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
