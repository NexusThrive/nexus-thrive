"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { GridBackdrop } from "@/components/molecules/grid-backdrop";
import { useShell } from "@/components/providers/shell-context";
import { formatCurrency } from "@/lib/foundation/format";
import type { HomeSummary } from "@/lib/experience/dashboard/home-summary";
import { cn } from "@/lib/utils";

const FAVORITES_KEY = "nexus.apps.favoritos";

const FAVORITES_EVENT = "nexus-favoritos";

/** Favoritos del usuario en este navegador (preferencia por visor, no datos del negocio). Sin almacenamiento, no hay favoritos. */
function readRaw(): string {
  try {
    return window.localStorage.getItem(FAVORITES_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function parseFavorites(raw: string): string[] {
  try {
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function subscribeFavorites(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(FAVORITES_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(FAVORITES_EVENT, onChange);
  };
}
function writeFavorites(list: string[]) {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(FAVORITES_EVENT));
  } catch {
    /* sin almacenamiento: el cambio dura lo que dure la página */
  }
}

/** Saludo según la hora de Bogotá: «Buenos días», «Buenas tardes» o «Buenas noches». */
function greetingOf(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(now));
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
}
/** «sábado, 7 de noviembre» (la etiqueta lo pone en mayúsculas). */
function dateLine(now: Date): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" }).format(now);
}
const compactMoney = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1 });
const timeFmt = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });

/** Etiqueta pequeña de sección y de fecha: 11 px, mayúsculas, espaciado amplio. */
const eyebrow = "text-2xs font-semibold uppercase tracking-[0.09em] text-muted-foreground";

export type AppHomeTrial = { daysLeft: number; level: "ok" | "soon" | "ended"; planHref: string };

/**
 * Inicio unificado: el saludo y, debajo, tres columnas. Al centro el cajón de aplicaciones (cada área habilitada para la organización
 * y el rol; abre su espacio de trabajo); a los lados, «Este mes» (ventas, vencido y balance) y «Hoy» y «Atención». Las cifras salen de
 * las mismas fuentes que Resumen (`loadHomeSummary`). Resumen ya no es una app del cajón (su ruta sigue existiendo).
 */
export function AppHome({ trial, summary, userName }: { trial?: AppHomeTrial | null; summary?: HomeSummary | null; userName?: string | null }) {
  const { groups, hrefFor } = useShell();
  const raw = useSyncExternalStore(subscribeFavorites, readRaw, () => "[]");
  const favorites = useMemo(() => parseFavorites(raw), [raw]);

  // Las áreas del negocio (sin «General», que era Resumen), y al final Configuración (el ítem de «Sistema»), que también es una app.
  const areas = useMemo(() => {
    const list = groups.filter((group) => group.label !== "Sistema" && group.label !== "General" && group.items.length > 0);
    const settings = groups.find((group) => group.label === "Sistema")?.items.find((item) => item.key === "settings");
    return settings ? [...list, { label: "Configuración", items: [settings], icon: settings.icon }] : list;
  }, [groups]);
  const hrefOfGroup = (label: string, fallback: string) => hrefFor(groups.find((g) => g.label === label)?.items[0]?.href ?? fallback);

  const toggle = (label: string) => {
    writeFavorites(favorites.includes(label) ? favorites.filter((f) => f !== label) : [...favorites, label]);
  };

  /** Icono de aplicación: cuadro redondeado con el icono y el nombre debajo, centrado (como las apps del celular). */
  const tile = (group: (typeof areas)[number]) => {
    const first = group.items[0]!;
    const Icon = group.icon ?? first.icon;
    const fav = favorites.includes(group.label);
    const badge = summary?.badges[group.label] ?? 0;
    return (
      <li key={group.label} className="group/app relative flex justify-center">
        <Link
          href={hrefFor(first.href)}
          className="group grid w-28 justify-items-center gap-3 rounded-[22px] text-center outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span className="relative grid size-[84px] place-items-center rounded-[22px] border border-border bg-card text-accent-text transition-[transform,background-color,border-color] duration-(--d1) ease-(--nx-ease-out) group-hover:-translate-y-[3px] group-hover:border-accent group-hover:bg-surface-hover motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
            <Icon aria-hidden="true" strokeWidth={1.5} className="size-[34px]" />
            {badge > 0 ? (
              <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-background bg-danger px-1 text-2xs font-semibold text-paper">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </span>
          <span className="line-clamp-2 text-ui font-medium leading-tight text-foreground">
            {group.label}
            {badge > 0 ? <span className="sr-only">, {badge} por atender</span> : null}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => toggle(group.label)}
          aria-pressed={fav}
          aria-label={`${fav ? "Quitar de" : "Agregar a"} favoritos: ${group.label}`}
          className={cn("absolute -left-0.5 -top-1.5 grid size-7 place-items-center rounded-full bg-card/90 shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-ring", fav ? "text-accent-text" : "text-muted-foreground opacity-0 group-hover/app:opacity-100 focus-visible:opacity-100")}
        >
          <Star aria-hidden="true" className={cn("size-3.5", fav && "fill-current")} />
        </button>
      </li>
    );
  };

  const now = new Date();
  const month = summary?.month ?? null;
  const today = summary?.today ?? null;
  const attention = summary?.attention ?? null;
  // Columnas laterales: base 240 px, entre 220 y 290 (bajo 1100 px ocupan el ancho y se apilan arriba y abajo del cajón).
  const side = "w-full max-w-xl pt-2 min-[1100px]:w-auto min-[1100px]:min-w-[220px] min-[1100px]:max-w-[290px] min-[1100px]:flex-[1_1_240px]";

  return (
    <div data-bleed="" className="relative isolate min-h-[calc(100dvh-var(--topbar-height)-7rem-env(safe-area-inset-bottom,0px))] overflow-hidden md:min-h-[calc(100dvh-var(--topbar-height)-4rem)]">
      <GridBackdrop variant="home" />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-6 pb-20 pt-5">
        {/* Cabecera: saludo y, a la derecha, la pastilla de la prueba */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-1.5">
            <p suppressHydrationWarning className={eyebrow}>
              {dateLine(now)}
            </p>
            <h1 suppressHydrationWarning className="text-3xl font-semibold tracking-tight text-foreground">
              {greetingOf(now)}
              {userName ? (
                <>
                  , <span className="text-accent-text">{userName}</span>
                </>
              ) : null}
            </h1>
          </div>
          {trial ? (
            <p className="inline-flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-ui text-foreground">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
              {trial.level === "ended" ? "Tu prueba gratuita terminó" : `Tu prueba gratuita termina en ${trial.daysLeft} ${trial.daysLeft === 1 ? "día" : "días"}`}
              <a href={trial.planHref} className="font-medium text-accent-text underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                Elige un plan
              </a>
            </p>
          ) : null}
        </div>

        {/* Tres columnas: Este mes · apps · Hoy y Atención (bajo 1100 px se apilan en ese orden) */}
        <div className="flex flex-wrap items-start justify-center gap-8">
          {month ? (
            <section aria-labelledby="home-mes" className={side}>
              <h2 id="home-mes" className={eyebrow}>
                Este mes
              </h2>
              <dl className="mt-2 divide-y divide-border/60">
                <Figure label="Ventas" value={formatCurrency(month.sales)} href={hrefOfGroup("Ventas y cobros", "/finanzas")} aside={<Sparkline values={month.weekTrend} />}>
                  {month.salesChange != null ? (
                    <span className={month.salesChange >= 0 ? "text-success" : "text-danger"}>
                      {month.salesChange >= 0 ? "▲" : "▼"} {Math.abs(month.salesChange)} % frente al mes anterior
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sin mes anterior para comparar</span>
                  )}
                </Figure>
                {month.overdue ? (
                  <Figure label="Por cobrar vencido" value={formatCurrency(month.overdue.total)} href={hrefFor("/finanzas/cartera")}>
                    {month.overdue.count > 0 ? (
                      <Link href={hrefFor("/finanzas/cartera")} className="text-danger underline-offset-2 hover:underline">
                        {month.overdue.count} {month.overdue.count === 1 ? "factura vencida" : "facturas vencidas"} · Ver cartera
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Nada vencido</span>
                    )}
                  </Figure>
                ) : null}
                <Figure label="Balance del mes" value={formatCurrency(month.balance)} href={hrefFor("/finanzas")}>
                  <span suppressHydrationWarning className="text-muted-foreground">
                    Actualizado hoy, {timeFmt.format(new Date(summary?.updatedAt ?? now))}
                  </span>
                </Figure>
              </dl>
            </section>
          ) : null}

          <nav aria-label="Aplicaciones" className="w-full pt-2 min-[1100px]:w-auto min-[1100px]:flex-[0_1_560px]">
            {areas.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No hay aplicaciones disponibles para tu cuenta.</p>
            ) : (
              <ul className="mx-auto grid w-fit grid-cols-[repeat(2,112px)] justify-center gap-x-7 gap-y-[30px] min-[420px]:grid-cols-[repeat(3,112px)] min-[600px]:grid-cols-[repeat(4,112px)]">{areas.map(tile)}</ul>
            )}
          </nav>

          {today || attention ? (
            <div className={cn(side, "grid gap-[22px]")}>
              {today ? (
                <section aria-labelledby="home-hoy">
                  <h2 id="home-hoy" className={eyebrow}>
                    Hoy
                  </h2>
                  <ul className="mt-1.5">
                    {today.next ? (
                      <Row dot="bg-accent" href={hrefFor("/bookings")} title={[today.next.title, today.next.customer].filter(Boolean).join(" · ")} note={[today.next.time, today.next.status].filter(Boolean).join(" · ")} />
                    ) : (
                      <Row dot="bg-muted-foreground/50" href={hrefFor("/bookings")} title="Nada programado para hoy" note="Abre la agenda para agendar una cita" />
                    )}
                    {today.more > 0 ? <Row dot="bg-muted-foreground/50" href={hrefFor("/bookings")} title={`${today.more} ${today.more === 1 ? "cita más programada" : "citas más programadas"}`} note="Ver la agenda del día" /> : null}
                  </ul>
                </section>
              ) : null}
              {attention ? (
                <section aria-labelledby="home-atencion">
                  <h2 id="home-atencion" className={eyebrow}>
                    Atención
                  </h2>
                  <ul className="mt-1.5">
                    {attention.overdueCount > 0 ? (
                      <Row
                        dot="bg-danger"
                        href={hrefFor("/finanzas/cartera")}
                        title={`${attention.overdueCount} ${attention.overdueCount === 1 ? "factura vencida" : "facturas vencidas"}`}
                        note={attention.overdueTotal != null ? `${compactMoney.format(attention.overdueTotal)} por cobrar` : "Revisa la cartera"}
                      />
                    ) : null}
                    {attention.expiringCount ? (
                      <Row
                        dot="bg-gold-300"
                        href={hrefFor("/memberships")}
                        title={`${attention.expiringCount} ${attention.expiringCount === 1 ? "membresía por vencer" : "membresías por vencer"}`}
                        note={`En los próximos ${attention.expiringDays} días`}
                      />
                    ) : null}
                    {attention.overdueCount === 0 && !attention.expiringCount ? <Row dot="bg-success" title="Todo al día" note="Nada vencido ni por vencer" /> : null}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Cifra de «Este mes»: etiqueta, valor grande (enlaza a su módulo), un acompañante opcional a la derecha y la nota debajo. */
function Figure({ label, value, href, aside, children }: { label: string; value: string; href: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-center justify-between gap-3">
        <Link href={href} className="text-2xl font-semibold tracking-tight text-foreground tabular-nums outline-none hover:text-accent-text focus-visible:outline-2 focus-visible:outline-ring">
          {value}
        </Link>
        {aside}
      </dd>
      <dd className="text-xs">{children}</dd>
    </div>
  );
}

/** Fila de «Hoy» y «Atención»: punto de estado, texto principal (dorado al pasar) y secundario. */
function Row({ dot, title, note, href }: { dot: string; title: string; note: string; href?: string }) {
  const body = (
    <>
      <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot)} />
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate text-ui text-foreground transition-colors duration-(--d1) group-hover:text-accent-text motion-reduce:transition-none">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{note}</span>
      </span>
    </>
  );
  return (
    <li className="border-b border-border/60">
      {href ? (
        <Link href={href} className="group flex gap-3 py-3 outline-none focus-visible:outline-2 focus-visible:outline-ring">
          {body}
        </Link>
      ) : (
        <div className="flex gap-3 py-3">{body}</div>
      )}
    </li>
  );
}

/** Línea de tendencia de 84×30 hecha con SVG a partir de los ingresos de la semana. Sin datos, no se pinta. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => `${((i / (values.length - 1)) * 82 + 1).toFixed(1)},${(29 - ((v - min) / span) * 28).toFixed(1)}`).join(" ");
  return (
    <svg aria-hidden="true" viewBox="0 0 84 30" className="h-[30px] w-[84px] shrink-0 text-success">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
