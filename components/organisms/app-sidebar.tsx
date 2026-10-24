"use client";

import { Fragment, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, PanelLeft } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences";
import { useShell } from "@/components/providers/shell-context";
import styles from "./app-sidebar.module.css";

const CLOSED_KEY = "nx-nav-closed";
const EMPTY: Record<string, boolean> = {};
const closedListeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue = EMPTY;
const subscribeClosed = (fn: () => void) => {
  closedListeners.add(fn);
  return () => void closedListeners.delete(fn);
};
/** Grupos ocultos (con la misma referencia mientras no cambie, como pide useSyncExternalStore). */
function readClosed(): Record<string, boolean> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CLOSED_KEY);
  } catch {
    /* sin almacenamiento */
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? (JSON.parse(raw) as Record<string, boolean>) : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
}

/**
 * Barra lateral del negocio (oculta en móvil, donde manda la barra inferior).
 * Arranca debajo de la navbar global, que lleva el logo, la búsqueda, «Crear» y
 * el selector de negocio:
 *
 * - Tablet o contraída: riel de 76 px solo con iconos y tooltip al pasar.
 * - PC ≥ 1200 px: 248 px con el logo completo, el negocio y los grupos.
 *
 * Blanca en claro e Ink en oscuro. El fondo del ítem activo se desliza entre
 * enlaces con un corte oro a la izquierda; contraer la barra se recuerda.
 */
export function AppSidebar() {
  const { groups, activeKey, hrefFor, onNavigate } = useShell();
  const { rail, setPreference } = usePreferences();
  const sideRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null);
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<number | undefined>(undefined);
  // Ingresos y Gastos se despliegan y se ocultan; lo elegido se recuerda en este navegador.
  const closed = useSyncExternalStore(subscribeClosed, readClosed, () => EMPTY);
  const toggle = (label: string) => {
    const next = { ...closed, [label]: !closed[label] };
    try {
      localStorage.setItem(CLOSED_KEY, JSON.stringify(next));
    } catch {
      /* sin almacenamiento: no se recuerda */
    }
    cachedRaw = null;
    closedListeners.forEach((fn) => fn());
  };

  useLayoutEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;
    const place = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) {
        indicator.style.opacity = "0";
        return;
      }
      indicator.style.opacity = "1";
      indicator.style.height = `${active.offsetHeight}px`;
      indicator.style.transform = `translateY(${active.offsetTop}px)`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [activeKey, rail, closed]);

  function showTip(event: React.PointerEvent) {
    const link = (event.target as Element).closest<HTMLElement>("a[aria-label]");
    const side = sideRef.current;
    if (!link || !side || side.hasAttribute("data-peek") || side.offsetWidth > 120) {
      setTip(null);
      return;
    }
    const r = link.getBoundingClientRect();
    setTip({ text: link.getAttribute("aria-label") ?? "", top: r.top + r.height / 2 - 14, left: r.right + 10 });
  }

  return (
    <aside
      ref={sideRef}
      className={styles.side}
      aria-label="Navegación principal"
      data-peek={peek ? "" : undefined}
      onPointerEnter={(event) => {
        // Solo con mouse y con 90 ms de intención: pasar de largo no la abre.
        if (event.pointerType !== "mouse") return;
        window.clearTimeout(peekTimer.current);
        peekTimer.current = window.setTimeout(() => setPeek(true), 90);
      }}
      onPointerLeave={() => {
        window.clearTimeout(peekTimer.current);
        setPeek(false);
      }}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) setPeek(true);
      }}
      onBlur={(event) => {
        if (!sideRef.current?.contains(event.relatedTarget as Node | null)) setPeek(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setPeek(false);
      }}
    >
      <nav ref={navRef} className={styles.nav} onPointerOver={showTip} onPointerLeave={() => setTip(null)}>
        <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
        {groups.map((group, g) => {
          // El riel (solo iconos) no oculta nada; el grupo con la página activa tampoco se esconde.
          const hasActive = group.items.some((item) => item.key === activeKey);
          const collapsed = Boolean(group.collapsible && closed[group.label] && !rail && !hasActive);
          const panel = `nav-group-${g}`;
          return (
            <Fragment key={group.label}>
              {g > 0 ? <div className={styles.sep} aria-hidden="true" /> : null}
              {group.collapsible ? (
                <button type="button" className={`${styles.groupLabel} ${styles.groupToggle}`} aria-expanded={!collapsed} aria-controls={panel} onClick={() => toggle(group.label)}>
                  <span>{group.label}</span>
                  <ChevronDown aria-hidden="true" className={styles.chevron} data-open={collapsed ? undefined : ""} />
                </button>
              ) : (
                <div className={styles.groupLabel}>{group.label}</div>
              )}
              <div id={panel} className={styles.groupItems} hidden={collapsed}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.key === activeKey;
                  return (
                    <Link
                      key={item.key}
                      href={hrefFor(item.href)}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      onClick={(event) => {
                        setPeek(false); // al elegir, el riel vuelve a su tamaño
                        onNavigate?.(item, event);
                      }}
                      className={styles.link}
                    >
                      <Icon aria-hidden="true" strokeWidth={1.6} />
                      <span className={styles.label}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </Fragment>
          );
        })}
      </nav>

      <div className={styles.foot}>
        <button
          type="button"
          className={styles.collapse}
          onClick={() => setPreference("rail", !rail)}
          aria-label={rail ? "Expandir barra lateral" : "Contraer barra lateral"}
          aria-pressed={rail}
        >
          <PanelLeft aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div
        role="tooltip"
        className={styles.tip}
        data-on={tip ? "" : undefined}
        style={tip ? { top: tip.top, left: tip.left } : undefined}
      >
        {tip?.text}
      </div>
    </aside>
  );
}
