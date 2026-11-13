"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, PanelLeft } from "lucide-react";
import { LinkPendingHint } from "@/components/atoms/link-pending-hint";
import { N_PATH } from "@nexus/brand/BrandLogo";
import { usePreferences } from "@/components/providers/preferences";
import { useShell } from "@/components/providers/shell-context";
import { shortLabel } from "@/lib/experience/navigation/short-label";
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

function writeClosed(next: Record<string, boolean>) {
  try {
    localStorage.setItem(CLOSED_KEY, JSON.stringify(next));
  } catch {
    /* sin almacenamiento: no se recuerda */
  }
  cachedRaw = null;
  closedListeners.forEach((fn) => fn());
}

/**
 * Barra lateral del negocio (oculta en móvil, donde manda la barra inferior).
 * Arranca debajo de la navbar global, que lleva el logo, la búsqueda, «Crear» y
 * el selector de negocio:
 *
 * - Tablet (768–1023 px): riel de 88 px con icono y etiqueta abreviada visible (DR-14).
 * - Contraída por el usuario (≥ 1024 px): riel de 76 px solo con iconos y tooltip al pasar.
 * - PC ≥ 1024 px: 248 px con el logo completo, el negocio y los grupos (DR-13).
 *
 * Blanca en claro e Ink en oscuro. El fondo del ítem activo se desliza entre
 * enlaces con un corte oro a la izquierda; contraer la barra se recuerda.
 */
export function AppSidebar({ variant }: { /** `workspace`: la barra del negocio (gris claro, sin líneas, con el bloque del negocio arriba y sin navbar de marca). */ variant?: "workspace" }) {
  const { groups, activeKey, hrefFor, onNavigate, brandName, brandSub } = useShell();
  const workspace = variant === "workspace";
  const { rail, setPreference } = usePreferences();
  const sideRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const pinnedRef = useRef<HTMLElement>(null);
  const pinnedIndicatorRef = useRef<HTMLSpanElement>(null);
  const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null);
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<number | undefined>(undefined);
  // Ingresos y Gastos se despliegan y se ocultan; lo elegido se recuerda en este navegador.
  const closed = useSyncExternalStore(subscribeClosed, readClosed, () => EMPTY);
  const mainGroups = groups.filter((group) => !group.pinned);
  const pinnedGroups = groups.filter((group) => group.pinned);
  const toggle = (label: string, collapsed: boolean) => writeClosed({ ...closed, [label]: !collapsed });

  // Marca en el menú qué lado tiene más por ver (`data-more="up|down|both"`): el CSS lo tapa con un degradado y una flecha (la barra va oculta en el armazón del negocio).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => {
      const up = nav.scrollTop > 8;
      const down = nav.scrollHeight - nav.clientHeight - nav.scrollTop > 8;
      if (up && down) nav.dataset.more = "both";
      else if (down) nav.dataset.more = "down";
      else if (up) nav.dataset.more = "up";
      else delete nav.dataset.more;
    };
    update();
    nav.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(nav);
    for (const child of Array.from(nav.children)) observer?.observe(child);
    return () => {
      nav.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [groups, closed]);

  useLayoutEffect(() => {
    const pairs = [
      [navRef.current, indicatorRef.current],
      [pinnedRef.current, pinnedIndicatorRef.current],
    ] as const;
    const observers: ResizeObserver[] = [];
    for (const [nav, indicator] of pairs) {
      if (!nav || !indicator) continue;
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
      observers.push(observer);
    }
    return () => observers.forEach((observer) => observer.disconnect());
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
      data-tour="nav"
      data-variant={variant}
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
      {workspace ? (
        <div className={styles.biz}>
          <span className={styles.bizMark} aria-hidden="true">
            <svg viewBox="387.6 239.9 744.4 606" shapeRendering="geometricPrecision">
              <path d={N_PATH} fill="currentColor" />
            </svg>
          </span>
          <span className={`${styles.label} ${styles.bizText}`}>
            <strong>{brandName}</strong>
            <small>{brandSub}</small>
          </span>
          <button type="button" className={styles.bizToggle} onClick={() => setPreference("rail", !rail)} aria-label={rail ? "Expandir barra lateral" : "Contraer barra lateral"} aria-pressed={rail}>
            <PanelLeft aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}
      <nav ref={navRef} className={styles.nav} onPointerOver={showTip} onPointerLeave={() => setTip(null)}>
        <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
        {mainGroups.map((group, g) => {
          // El riel (solo iconos) no oculta nada; el grupo con la página activa tampoco se esconde.
          const hasActive = group.items.some((item) => item.key === activeKey);
          // Un grupo con icono es una opción desplegable: abierto si lo eligió la persona o, sin elección, si tiene la página activa.
          const asOption = Boolean(group.icon);
          const collapsed = asOption ? !rail && (closed[group.label] ?? !hasActive) : Boolean(group.collapsible && closed[group.label] && !rail && !hasActive);
          const GroupIcon = group.icon;
          const panel = `nav-group-${g}`;
          return (
            <Fragment key={group.label}>
              {asOption && GroupIcon ? (
                <button type="button" className={styles.groupRow} aria-expanded={!collapsed} aria-controls={panel} onClick={() => toggle(group.label, collapsed)}>
                  <GroupIcon aria-hidden="true" strokeWidth={1.6} />
                  <span className={styles.label}>{group.label}</span>
                  <ChevronDown aria-hidden="true" className={styles.chevron} data-open={collapsed ? undefined : ""} />
                </button>
              ) : (
                <>
                  {g > 0 ? <div className={styles.sep} aria-hidden="true" /> : null}
                  {group.collapsible ? (
                    <button type="button" className={`${styles.groupLabel} ${styles.groupToggle}`} aria-expanded={!collapsed} aria-controls={panel} onClick={() => toggle(group.label, collapsed)}>
                      <span>{group.label}</span>
                      <ChevronDown aria-hidden="true" className={styles.chevron} data-open={collapsed ? undefined : ""} />
                    </button>
                  ) : (
                    group.label === "General" ? null : <div className={styles.groupLabel}>{group.label}</div>
                  )}
                </>
              )}
              <div id={panel} className={styles.groupItems} data-nested={asOption ? "" : undefined} hidden={collapsed}>
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
                        onNavigate?.(item, event);
                      }}
                      className={styles.link}
                    >
                      <Icon aria-hidden="true" strokeWidth={1.6} />
                      <span className={styles.label}>{item.label}</span>
                      <span className={styles.short} aria-hidden="true">{shortLabel(item.label)}</span>
                      <LinkPendingHint />
                    </Link>
                  );
                })}
              </div>
            </Fragment>
          );
        })}
      </nav>

      <div className={styles.foot}>
        {pinnedGroups.length > 0 ? (
          <nav ref={pinnedRef} className={styles.pinned} aria-label="Sistema" onPointerOver={showTip} onPointerLeave={() => setTip(null)}>
            <span ref={pinnedIndicatorRef} className={styles.indicator} aria-hidden="true" />
            {pinnedGroups.flatMap((group) => group.items).map((item) => {
              const Icon = item.icon;
              const active = item.key === activeKey;
              return (
                <Link
                  key={item.key}
                  href={hrefFor(item.href)}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => {
                    onNavigate?.(item, event);
                  }}
                  className={styles.link}
                >
                  <Icon aria-hidden="true" strokeWidth={1.6} />
                  <span className={styles.label}>{item.label}</span>
                      <span className={styles.short} aria-hidden="true">{shortLabel(item.label)}</span>
                      <LinkPendingHint />
                </Link>
              );
            })}
          </nav>
        ) : null}
        <button
          type="button"
          className={styles.collapse}
          onClick={() => setPreference("rail", !rail)}
          aria-label={rail ? "Expandir barra lateral" : "Contraer barra lateral"}
          aria-pressed={rail}
        >
          <PanelLeft aria-hidden="true" className="size-4" />
          <span className={styles.label}>{rail ? "Expandir" : "Contraer"}</span>
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
