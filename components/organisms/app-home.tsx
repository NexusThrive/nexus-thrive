"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { GridBackdrop } from "@/components/molecules/grid-backdrop";
import { useShell } from "@/components/providers/shell-context";
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

/** Saludo y fecha de hoy en Bogotá: «Buenos días · sábado, 7 de noviembre». */
function greetingLine(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(now));
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const date = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" }).format(now);
  return `${greeting} · ${date}`;
}

/**
 * Pantalla de aplicaciones de Nexus (App Home): la entrada del negocio. No es el dashboard: no muestra cifras. Cada tarjeta es un
 * área habilitada para la organización y el rol; abre su espacio de trabajo. Inicio es una aplicación más.
 */
export type AppHomeTrial = { daysLeft: number; level: "ok" | "soon" | "ended"; planHref: string };

export function AppHome({ trial }: { trial?: AppHomeTrial | null }) {
  const { groups, hrefFor } = useShell();
  const raw = useSyncExternalStore(subscribeFavorites, readRaw, () => "[]");
  const favorites = useMemo(() => parseFavorites(raw), [raw]);

  const areas = useMemo(() => groups.filter((group) => group.label !== "Sistema" && group.items.length > 0), [groups]);
  const visible = areas;

  const toggle = (label: string) => {
    writeFavorites(favorites.includes(label) ? favorites.filter((f) => f !== label) : [...favorites, label]);
  };

  /** Icono de aplicación: cuadro redondeado con el icono y el nombre debajo, centrado (como las apps del celular). */
  const tile = (group: (typeof areas)[number]) => {
    const first = group.items[0]!;
    const Icon = group.icon ?? first.icon;
    const fav = favorites.includes(group.label);
    const label = group.label === "General" ? "Inicio" : group.label;
    return (
      <li key={group.label} className="relative flex justify-center">
        <Link
          href={hrefFor(first.href)}
          aria-label={`${label}: ${group.items.length} ${group.items.length === 1 ? "sección" : "secciones"}`}
          className="group grid w-24 justify-items-center gap-2 rounded-2xl p-2 text-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="grid size-20 place-items-center rounded-2xl border border-border bg-card text-accent-text shadow-sm transition-[transform,background-color] duration-200 group-hover:-translate-y-0.5 group-hover:bg-accent-subtle sm:size-22">
            <Icon aria-hidden="true" className="size-9" />
          </span>
          <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">{label}</span>
        </Link>
        <button
          type="button"
          onClick={() => toggle(group.label)}
          aria-pressed={fav}
          aria-label={`${fav ? "Quitar de" : "Agregar a"} favoritos: ${group.label}`}
          className={cn("absolute end-0 top-0 grid size-7 place-items-center rounded-full bg-card/90 shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-ring", fav ? "text-accent-text" : "text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
        >
          <Star aria-hidden="true" className={cn("size-3.5", fav && "fill-current")} />
        </button>
      </li>
    );
  };

  return (
    <div className="relative isolate -mx-4 flex min-h-[calc(100dvh-var(--topbar-height))] flex-col items-center overflow-hidden px-4 pb-10 pt-8 sm:-mx-6 sm:px-6">
      <GridBackdrop />
      {trial ? (
        <div className="mb-4 w-full rounded-lg border border-border bg-card/60 px-4 py-2.5 text-center text-sm text-foreground backdrop-blur-sm">
          {trial.level === "ended" ? "Tu prueba gratuita terminó. " : `Tu prueba gratuita termina en ${trial.daysLeft} ${trial.daysLeft === 1 ? "día" : "días"}. `}
          <a href={trial.planHref} className="font-medium underline underline-offset-2 hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Elige un plan</a>
        </div>
      ) : null}
      <p suppressHydrationWarning className="mb-8 w-full text-center text-xs text-muted-foreground">{greetingLine(new Date())}</p>
      {visible.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No hay aplicaciones disponibles para tu cuenta.</p>
      ) : (
        <ul className="mx-auto grid w-full max-w-4xl grid-cols-3 justify-items-center gap-x-4 gap-y-8 sm:grid-cols-6">{visible.map(tile)}</ul>
      )}
    </div>
  );
}
