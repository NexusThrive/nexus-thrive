"use client";

/* eslint-disable react-hooks/refs -- useDraggable/useDroppable de dnd-kit devuelven refs de callback y listeners, no valores de ref; el lint los confunde. */

import { useState } from "react";
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
import { ArrowDown, ArrowRight, ArrowUp, ExternalLink, GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { useReducedMotion } from "@/lib/experience/hooks/use-reduced-motion";
import type { PipelineCard, PipelineStage } from "@/lib/business/growth/pipeline-db";
import type { PickerCustomer } from "@/lib/business/growth/pipeline-read";
import { cardChip, columnBar, shortMoney } from "@/lib/business/growth/pipeline";
import { cn } from "@/lib/utils";
import { ActivityChip, Initials, Stars } from "./pipeline-ui";
import { QuickCreate } from "./quick-create";

/** Contenido de una tarjeta (lo comparten la tarjeta y la vista previa del arrastre). */
function CardBody({ card, now }: { card: PipelineCard; now: number }) {
  return (
    <>
      <span className="text-sm font-medium leading-snug text-foreground">{card.name}</span>
      <span className="text-ui text-muted-foreground">
        <b className="font-semibold text-foreground">{shortMoney(card.value)}</b> · {card.probability} %
      </span>
      {card.customer ? (
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Initials name={card.customer.name} />
          <span className="truncate">{card.customer.name}</span>
        </span>
      ) : null}
      {card.tags.length ? (
        <span className="flex flex-wrap gap-1">
          {card.tags.map((t) => (
            <span key={t} className="rounded-full border border-border-strong px-2 py-0.5 text-2xs text-foreground">
              {t}
            </span>
          ))}
        </span>
      ) : null}
      <span className="flex items-center gap-2">
        <Stars value={card.priority} />
        <ActivityChip chip={cardChip(card, now)} className="ms-auto" />
        {card.owner ? (
          <span title={`Responsable: ${card.owner.name}`}>
            <Initials name={card.owner.name} size={24} tone="accent" />
            <span className="sr-only">Responsable: {card.owner.name}</span>
          </span>
        ) : null}
      </span>
    </>
  );
}

/**
 * Tarjeta: enlace al detalle. Se toma entera con el cursor (6 px) o el dedo (mantener 220 ms); con teclado, desde el asa. El menú
 * («Mover a», «Subir», «Bajar») es la alternativa sin arrastrar.
 */
function Card({
  slug,
  card,
  stages,
  now,
  saving,
  index,
  count,
  onMove,
  onShift,
}: {
  slug: string;
  card: PipelineCard;
  stages: PipelineStage[];
  now: number;
  saving: boolean;
  index: number;
  count: number;
  onMove: (card: PipelineCard, stageId: string) => void;
  onShift: (card: PipelineCard, delta: -1 | 1) => void;
}) {
  const movable = !card.won;
  const drag = useDraggable({ id: card.id, disabled: !movable });
  const drop = useDroppable({ id: `card:${card.id}`, disabled: !movable });
  const { onKeyDown: handleKeyDown, ...pointerListeners } = (drag.listeners ?? {}) as Record<string, React.EventHandler<never>>;
  return (
    <li
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      {...(movable ? pointerListeners : {})}
      className={cn(
        "group relative rounded-xl border border-border bg-card transition-[border-color,opacity] duration-(--d1) hover:border-accent motion-reduce:transition-none",
        movable && "cursor-grab select-none active:cursor-grabbing",
        card.won && "border-l-2 border-l-success",
        saving && "opacity-60",
        drag.isDragging && "opacity-30",
        drop.isOver && !drag.isDragging && "border-t-2 border-t-accent",
      )}
    >
      {movable ? (
        <button
          type="button"
          ref={drag.setActivatorNodeRef}
          onKeyDown={handleKeyDown as React.KeyboardEventHandler}
          {...drag.attributes}
          aria-label={`Arrastrar ${card.name}`}
          className="absolute left-0 top-0 hidden h-full w-6 cursor-grab items-center justify-center rounded-l-xl text-muted-foreground opacity-0 outline-none transition-opacity duration-(--d1) hover:bg-surface-muted focus-visible:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring group-hover:opacity-100 md:flex"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      <Link href={`/${slug}/crm/oportunidades/${card.id}`} draggable={false} className="flex flex-col gap-2.5 rounded-xl p-3.5 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <CardBody card={card} now={now} />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`Opciones de ${card.name}`} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 outline-none hover:bg-surface-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring group-hover:opacity-100 data-[state=open]:opacity-100">
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {movable ? (
            <>
              <DropdownMenuLabel>Mover a</DropdownMenuLabel>
              {stages
                .filter((s) => s.id !== card.stageId)
                .map((s) => (
                  <DropdownMenuItem key={s.id} onSelect={() => onMove(card, s.id)}>
                    <ArrowRight aria-hidden="true" />
                    {s.name}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={index === 0} onSelect={() => onShift(card, -1)}>
                <ArrowUp aria-hidden="true" />
                Subir
              </DropdownMenuItem>
              <DropdownMenuItem disabled={index === count - 1} onSelect={() => onShift(card, 1)}>
                <ArrowDown aria-hidden="true" />
                Bajar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={`/${slug}/crm/oportunidades/${card.id}`}>
              <ExternalLink aria-hidden="true" />
              Abrir
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function Column({
  slug,
  stage,
  stages,
  cards,
  dragging,
  now,
  savingIds,
  quick,
  preset,
  onOpenQuick,
  onCloseQuick,
  onMove,
  onShift,
}: {
  slug: string;
  stage: PipelineStage;
  stages: PipelineStage[];
  cards: PipelineCard[];
  dragging: PipelineCard | null;
  now: number;
  savingIds: ReadonlySet<string>;
  quick: boolean;
  preset: PickerCustomer | null;
  onOpenQuick: () => void;
  onCloseQuick: () => void;
  onMove: (card: PipelineCard, stageId: string) => void;
  onShift: (card: PipelineCard, delta: -1 | 1) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage.id}` });
  const total = cards.reduce((t, c) => t + c.value, 0);
  const bar = columnBar(cards, now);
  const target = dragging && dragging.stageId !== stage.id;
  return (
    <section
      ref={setNodeRef}
      aria-label={stage.name}
      className={cn("flex w-[300px] shrink-0 flex-col gap-3 rounded-xl outline-2 -outline-offset-2 outline-transparent transition-[outline-color] duration-(--d1)", target && "outline-dashed outline-border-strong", isOver && target && "outline-solid outline-accent")}
    >
      <header className="flex items-center gap-2 px-0.5">
        <h2 className="text-base font-semibold text-foreground">{stage.name}</h2>
        <span className="rounded-full bg-surface-muted px-2 py-px text-xs text-muted-foreground" aria-label={`${cards.length} oportunidades`}>
          {cards.length}
        </span>
        <span className="ms-auto text-ui text-muted-foreground tabular-nums">{shortMoney(total)}</span>
        <button
          type="button"
          onClick={onOpenQuick}
          aria-label={`Agregar a ${stage.name}`}
          className="grid size-7 place-items-center rounded-lg border border-border text-muted-foreground outline-none transition-colors duration-(--d1) hover:border-accent hover:text-accent-text focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </header>
      <div aria-hidden="true" className="mx-0.5 mb-0.5 flex h-[3px] overflow-hidden rounded-sm bg-border/60">
        <i className="block h-full bg-success" style={{ width: `${bar.planned}%` }} />
        <i className="block h-full bg-gold-300" style={{ width: `${bar.today}%` }} />
        <i className="block h-full bg-danger" style={{ width: `${bar.overdue}%` }} />
        <i className="block h-full bg-border-strong" style={{ width: `${bar.none}%` }} />
      </div>
      {quick ? <QuickCreate slug={slug} stageId={stage.id} preset={preset} onClose={onCloseQuick} /> : null}
      <ul className="flex min-h-16 flex-col gap-3">
        {cards.map((c, i) => (
          <Card key={c.id} slug={slug} card={c} stages={stages} now={now} saving={savingIds.has(c.id)} index={i} count={cards.length} onMove={onMove} onShift={onShift} />
        ))}
      </ul>
    </section>
  );
}

/** Flechas ← → pasan la tarjeta tomada a la columna vecina. */
const columnCoordinates: KeyboardCoordinateGetter = (event, { context: { active, droppableRects, droppableContainers, collisionRect } }) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.code) || !active || !collisionRect) return undefined;
  event.preventDefault();
  const columns = droppableContainers
    .getEnabled()
    .filter((c) => String(c.id).startsWith("stage:"))
    .map((container) => ({ id: container.id, rect: droppableRects.get(container.id) }))
    .filter((c): c is { id: typeof c.id; rect: NonNullable<typeof c.rect> } => Boolean(c.rect))
    .sort((a, b) => a.rect.left - b.rect.left);
  if (columns.length === 0) return undefined;
  const cx = collisionRect.left + collisionRect.width / 2;
  const current = columns.findIndex((c) => cx >= c.rect.left && cx <= c.rect.left + c.rect.width);
  const next = columns[Math.min(columns.length - 1, Math.max(0, (current < 0 ? 0 : current) + (event.code === "ArrowRight" ? 1 : -1)))]!;
  return { x: next.rect.left + 12, y: next.rect.top + 48 };
};

/**
 * Tablero del pipeline: una columna de 300 px por etapa, con scroll horizontal; al final, Perdidos plegada y «+ Etapa». Soltar en otra
 * columna cambia la etapa (y en Ganado, la gana); soltar sobre una tarjeta de la misma columna la deja encima. El cambio es
 * optimista: lo gestiona `PipelineView`.
 */
export function Board({
  slug,
  stages,
  cards,
  lost,
  now,
  savingIds,
  quickStage,
  preset,
  empty,
  onQuick,
  onMove,
  onReorder,
  onShowLost,
}: {
  slug: string;
  stages: PipelineStage[];
  cards: PipelineCard[];
  lost: { count: number; total: number };
  now: number;
  savingIds: ReadonlySet<string>;
  quickStage: string | null;
  preset: PickerCustomer | null;
  empty: boolean;
  onQuick: (stageId: string | null) => void;
  onMove: (card: PipelineCard, stageId: string) => void;
  onReorder: (stageId: string, ids: string[]) => void;
  onShowLost: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates }),
  );
  const dragging = cards.find((c) => c.id === activeId) ?? null;
  const byStage = (id: string) => cards.filter((c) => c.stageId === id);
  const stageName = (over: unknown) => {
    const id = String(over ?? "");
    const stageId = id.startsWith("stage:") ? id.slice(6) : cards.find((c) => `card:${c.id}` === id)?.stageId;
    return stages.find((s) => s.id === stageId)?.name ?? "fuera de las columnas";
  };
  const nameOf = (id: unknown) => cards.find((c) => c.id === id)?.name ?? "Oportunidad";
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${nameOf(active.id)}. Usa las flechas izquierda y derecha para cambiar de etapa, Espacio para soltar y Escape para cancelar.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} sobre ${stageName(over.id)}.` : `${nameOf(active.id)} fuera de las columnas.`),
    onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} soltada en ${stageName(over.id)}.` : `${nameOf(active.id)} soltada sin cambios.`),
    onDragCancel: ({ active }) => `Cancelaste el movimiento de ${nameOf(active.id)}.`,
  };

  const shift = (card: PipelineCard, delta: -1 | 1) => {
    const ids = byStage(card.stageId).map((c) => c.id);
    const i = ids.indexOf(card.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    onReorder(card.stageId, ids);
  };

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const card = cards.find((c) => c.id === event.active.id);
    const over = String(event.over?.id ?? "");
    if (!card || !over) return;
    if (over.startsWith("stage:")) {
      const stageId = over.slice(6);
      if (stageId !== card.stageId) onMove(card, stageId);
      return;
    }
    const target = cards.find((c) => `card:${c.id}` === over);
    if (!target || target.id === card.id) return;
    if (target.stageId !== card.stageId) return onMove(card, target.stageId);
    // Misma columna: queda encima de la tarjeta sobre la que se soltó.
    const ids = byStage(card.stageId).map((c) => c.id).filter((id) => id !== card.id);
    ids.splice(ids.indexOf(target.id), 0, card.id);
    onReorder(card.stageId, ids);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: "Para mover esta oportunidad de etapa, pulsa Espacio, usa las flechas izquierda y derecha y pulsa Espacio otra vez. También puedes usar su menú «Mover a»." },
      }}
    >
      <div className="relative">
        <div className="flex items-start gap-4 overflow-x-auto px-5 pb-12 pt-1">
          {stages.map((s, i) => (
            <Column
              key={s.id}
              slug={slug}
              stage={s}
              stages={stages}
              cards={byStage(s.id)}
              dragging={dragging}
              now={now}
              savingIds={savingIds}
              quick={quickStage === s.id || (quickStage === "first" && i === 0)}
              preset={preset}
              onOpenQuick={() => onQuick(s.id)}
              onCloseQuick={() => onQuick(null)}
              onMove={onMove}
              onShift={shift}
            />
          ))}
          <section aria-label="Perdidos y nueva etapa" className="flex w-[150px] shrink-0 flex-col gap-3">
            <header className="flex items-center gap-2 px-0.5">
              <h2 className="text-base font-semibold text-muted-foreground">Perdidos</h2>
              <span className="rounded-full bg-surface-muted px-2 py-px text-xs text-muted-foreground">{lost.count}</span>
            </header>
            <button type="button" onClick={onShowLost} className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-3.5 text-left outline-none hover:border-accent focus-visible:outline-2 focus-visible:outline-ring">
              <span className="text-ui text-muted-foreground">Ver oportunidades perdidas</span>
              <span className="text-xs text-muted-foreground tabular-nums">{shortMoney(lost.total)}</span>
            </button>
            <Link href={`/${slug}/crm/configuracion#etapas`} className="grid h-9 place-items-center rounded-[10px] border border-dashed border-border-strong text-ui text-muted-foreground outline-none hover:border-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              + Etapa
            </Link>
          </section>
        </div>
        {empty ? (
          <div className="pointer-events-none absolute inset-x-0 top-28 flex justify-center px-5">
            <div className="pointer-events-auto grid max-w-sm justify-items-center gap-3 rounded-xl border border-border bg-card px-6 py-7 text-center">
              <h2 className="font-display text-lg font-semibold text-foreground">Crea tu primera oportunidad</h2>
              <p className="text-ui text-muted-foreground">Anota a quién le estás vendiendo, cuánto vale y cuál es el siguiente paso.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={() => onQuick("first")} className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px] font-semibold" })}>
                  Nueva oportunidad
                </button>
                <Link href={`/${slug}/data`} className="text-ui font-medium text-accent-text underline-offset-2 hover:underline">
                  Importar contactos
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <DragOverlay dropAnimation={{ duration: reduced ? 0 : 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {dragging ? (
          <div className="flex w-[300px] rotate-[1.5deg] flex-col gap-2.5 rounded-xl border border-accent bg-card p-3.5 shadow-[var(--nx-shadow-overlay)]">
            <CardBody card={dragging} now={now} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
