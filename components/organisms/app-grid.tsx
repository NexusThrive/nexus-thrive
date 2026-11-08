"use client";

/* eslint-disable react-hooks/refs -- useDraggable/useDroppable de dnd-kit devuelven refs de callback y listeners, no valores de ref; el lint los confunde. */

import { ViewTransition, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { GripVertical, Star, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** `vt`: nombre de View Transition compartido con la vista de la app (`appTransitionName`): el icono crece hasta ella al abrirla. */
export type AppArea = { label: string; href: string; icon: LucideIcon; sections: number; vt?: string };

/* Preferencias de este navegador (por visor, no datos del negocio): favoritos y orden de las apps. Sin almacenamiento, no hay. */
const FAVORITES_KEY = "nexus.apps.favoritos";
const ORDER_KEY = "nexus.apps.orden";
const PREFS_EVENT = "nexus-apps-prefs";

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}
function parseList(raw: string): string[] {
  try {
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PREFS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PREFS_EVENT, onChange);
  };
}
function write(key: string, list: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event(PREFS_EVENT));
  } catch {
    /* sin almacenamiento: el cambio dura lo que dure la página */
  }
}

/** Flechas pasan la app tomada a la vecina (izquierda/derecha y arriba/abajo por filas), en vez de moverla unos píxeles. */
const tileCoordinates: KeyboardCoordinateGetter = (event, { context: { active, droppableRects, droppableContainers, collisionRect } }) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.code) || !active || !collisionRect) return undefined;
  event.preventDefault();
  const tiles = droppableContainers
    .getEnabled()
    .map((c) => ({ id: c.id, rect: droppableRects.get(c.id) }))
    .filter((t): t is { id: typeof t.id; rect: NonNullable<typeof t.rect> } => Boolean(t.rect))
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
  if (!tiles.length) return undefined;
  const cx = collisionRect.left + collisionRect.width / 2;
  const cy = collisionRect.top + collisionRect.height / 2;
  const current = tiles.reduce((best, t, i) => {
    const d = Math.hypot(t.rect.left + t.rect.width / 2 - cx, t.rect.top + t.rect.height / 2 - cy);
    return d < best.d ? { i, d } : best;
  }, { i: 0, d: Number.POSITIVE_INFINITY }).i;
  const cols = tiles.filter((t) => Math.abs(t.rect.top - tiles[0]!.rect.top) < 4).length || 1;
  const step = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : event.code === "ArrowDown" ? cols : -cols;
  const next = tiles[Math.min(tiles.length - 1, Math.max(0, current + step))]!;
  return { x: next.rect.left + next.rect.width / 2 - collisionRect.width / 2, y: next.rect.top };
};

function TileBody({ area, badge, shared = false }: { area: AppArea; badge: number; shared?: boolean }) {
  const Icon = area.icon;
  const square = (
      <span className="relative grid size-[84px] place-items-center rounded-[22px] border border-border bg-card text-accent-text transition-[transform,background-color,border-color,box-shadow] duration-(--d2) ease-(--nx-ease-out) group-hover:-translate-y-[3px] group-hover:border-accent group-hover:bg-surface-hover motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <Icon aria-hidden="true" strokeWidth={1.5} className="size-[34px] transition-transform duration-(--d2) ease-(--nx-ease-out) group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        {badge > 0 ? (
          <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-background bg-danger px-1 text-2xs font-semibold text-paper">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
  );
  return (
    <>
      {/* Solo el icono del cajón lleva el nombre (la copia que se arrastra no: los nombres no se repiten). */}
      {shared && area.vt ? (
        <ViewTransition name={area.vt} share="nx-app" default="none">
          {square}
        </ViewTransition>
      ) : (
        square
      )}
      {/* Una sola línea: si el nombre es largo, termina en «…» (el nombre completo queda para el lector y el título). */}
      <span className="block w-full truncate text-ui font-medium leading-tight text-foreground">{area.label}</span>
    </>
  );
}

function Tile({ area, badge, fav, onToggleFav, consumeDrag, settling, onSettled }: { area: AppArea; badge: number; fav: boolean; onToggleFav: () => void; consumeDrag: () => boolean; settling: boolean; onSettled: () => void }) {
  const drag = useDraggable({ id: area.label });
  const drop = useDroppable({ id: area.label });
  const { onKeyDown: handleKeyDown, ...pointer } = (drag.listeners ?? {}) as Record<string, React.EventHandler<never>>;
  return (
    <li
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      {...pointer}
      onAnimationEnd={(e) => {
        if (e.animationName === "nx-settle") onSettled();
      }}
      className={cn("group/app relative flex touch-manipulation justify-center", settling && "nx-settle", drag.isDragging && "opacity-30", drop.isOver && !drag.isDragging && "[&_.app-tile]:outline-dashed [&_.app-tile]:outline-2 [&_.app-tile]:outline-offset-4 [&_.app-tile]:outline-accent")}
    >
      <Link
        href={area.href}
        draggable={false}
        title={area.label}
        onClickCapture={(e) => {
          // Después de soltar no se abre la app (el clic del final del arrastre).
          if (consumeDrag()) e.preventDefault();
        }}
        className="app-tile group grid w-28 select-none justify-items-center gap-3 rounded-[22px] text-center outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <TileBody area={area} badge={badge} shared />
        {badge > 0 ? <span className="sr-only">, {badge} por atender</span> : null}
      </Link>
      <button
        type="button"
        onClick={onToggleFav}
        aria-pressed={fav}
        aria-label={`${fav ? "Quitar de" : "Agregar a"} favoritos: ${area.label}`}
        className={cn("absolute -left-0.5 -top-1.5 grid size-7 place-items-center rounded-full bg-card/90 shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-ring", fav ? "text-accent-text" : "text-muted-foreground opacity-0 group-hover/app:opacity-100 focus-visible:opacity-100")}
      >
        <Star aria-hidden="true" className={cn("size-3.5", fav && "fill-current")} />
      </button>
      {/* Asa para mover con teclado (Espacio para tomar, flechas, Espacio para soltar). Con el dedo o el mouse: mantener presionado. */}
      <button
        type="button"
        ref={drag.setActivatorNodeRef}
        onKeyDown={handleKeyDown as React.KeyboardEventHandler}
        {...drag.attributes}
        aria-label={`Mover ${area.label}`}
        className="absolute -right-0.5 -top-1.5 grid size-7 place-items-center rounded-full bg-card/90 text-muted-foreground opacity-0 shadow-sm outline-none focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring group-hover/app:opacity-100"
      >
        <GripVertical aria-hidden="true" className="size-3.5" />
      </button>
    </li>
  );
}

/**
 * Cajón de aplicaciones: iconos con su nombre en una línea (con «…» si es largo), transición al pasar el cursor, favoritos y orden
 * propio. Se reordena dejando presionada una app (se alza, como en el tablero del CRM) y soltándola sobre otra; con teclado, el asa
 * «Mover» (Espacio, flechas, Espacio). El orden y los favoritos se guardan en este navegador.
 */
export function AppGrid({ areas, badges }: { areas: AppArea[]; badges: Record<string, number> }) {
  const favRaw = useSyncExternalStore(subscribe, () => read(FAVORITES_KEY), () => "[]");
  const orderRaw = useSyncExternalStore(subscribe, () => read(ORDER_KEY), () => "[]");
  const favorites = useMemo(() => parseList(favRaw), [favRaw]);
  const order = useMemo(() => parseList(orderRaw), [orderRaw]);
  const sorted = useMemo(() => {
    const rank = new Map(order.map((label, i) => [label, i]));
    return [...areas].sort((a, b) => (rank.get(a.label) ?? 1000 + areas.indexOf(a)) - (rank.get(b.label) ?? 1000 + areas.indexOf(b)));
  }, [areas, order]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // La app recién soltada: cae en su lugar con un rebote (`nx-settle`) en vez de la animación de regreso de la copia.
  const [settled, setSettled] = useState<string | null>(null);
  const justDragged = useRef(false);
  const sensors = useSensors(
    // Mantener presionado para alzarla: un clic corto abre la app.
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: tileCoordinates }),
  );
  const active = sorted.find((a) => a.label === activeId) ?? null;
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Tomaste ${a.id}. Usa las flechas para moverla, Espacio para soltar y Escape para cancelar.`,
    onDragOver: ({ active: a, over }) => (over ? `${a.id} sobre el lugar de ${over.id}.` : `${a.id} fuera del cajón.`),
    onDragEnd: ({ active: a, over }) => (over && over.id !== a.id ? `${a.id} quedó en el lugar de ${over.id}.` : `${a.id} se queda donde estaba.`),
    onDragCancel: ({ active: a }) => `Cancelaste el movimiento de ${a.id}.`,
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (e.over) setSettled(String(e.active.id));
    justDragged.current = true;
    window.setTimeout(() => (justDragged.current = false), 0);
    const from = String(e.active.id);
    const to = e.over ? String(e.over.id) : null;
    if (!to || to === from) return;
    const labels = sorted.map((a) => a.label).filter((l) => l !== from);
    labels.splice(labels.indexOf(to) + (sorted.findIndex((a) => a.label === from) < sorted.findIndex((a) => a.label === to) ? 1 : 0), 0, from);
    write(ORDER_KEY, labels);
  };

  if (!areas.length) return <p className="text-center text-sm text-muted-foreground">No hay aplicaciones disponibles para tu cuenta.</p>;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{ announcements, screenReaderInstructions: { draggable: "Para mover esta app, pulsa Espacio, usa las flechas y pulsa Espacio otra vez para soltarla." } }}
    >
      <ul className="mx-auto grid w-fit grid-cols-[repeat(2,112px)] justify-center gap-x-7 gap-y-[30px] min-[420px]:grid-cols-[repeat(3,112px)] min-[600px]:grid-cols-[repeat(4,112px)]">
        {sorted.map((area) => (
          <Tile
            key={area.label}
            area={area}
            badge={badges[area.label] ?? 0}
            fav={favorites.includes(area.label)}
            onToggleFav={() => write(FAVORITES_KEY, favorites.includes(area.label) ? favorites.filter((f) => f !== area.label) : [...favorites, area.label])}
            settling={settled === area.label}
            onSettled={() => setSettled(null)}
            consumeDrag={() => {
              const was = justDragged.current;
              justDragged.current = false;
              return was;
            }}
          />
        ))}
      </ul>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="grid w-28 scale-105 justify-items-center gap-3 text-center [&>span:first-child]:-translate-y-1 [&>span:first-child]:border-accent [&>span:first-child]:shadow-[var(--nx-shadow-overlay)]">
            <TileBody area={active} badge={badges[active.label] ?? 0} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
