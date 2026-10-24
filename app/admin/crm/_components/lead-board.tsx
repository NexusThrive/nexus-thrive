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
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { ArrowRight, CalendarClock, GripVertical, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { dropRule, followUpState, isActiveStage, LEAD_STAGES, stageMeta, type LeadStageValue } from "@/lib/ops/crm-rules";
import type { LeadRow } from "@/lib/ops/leads";
import { formatUsdCents } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";

const FOLLOW = {
  overdue: "text-danger",
  today: "text-accent-text",
  upcoming: "text-muted-foreground",
  none: "text-muted-foreground",
} as const;

function shortDate(d: string, today: string) {
  if (d === today) return "Hoy";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Contenido visual de un lead (lo comparten la tarjeta, la lista móvil y la vista previa del arrastre). */
function LeadCardBody({ lead, today, asLink = true }: { lead: LeadRow; today: string; asLink?: boolean }) {
  const follow = followUpState(lead.stage, lead.nextStepDate, today);
  const inner = (
    <>
      <b className="truncate text-[13.5px] font-medium">{lead.company}</b>
      <small className="truncate text-xs text-muted-foreground">
        {[lead.contactName, lead.city].filter(Boolean).join(" · ") || lead.source}
      </small>
      {lead.nextStep ? (
        <small className={cn("mt-1 flex items-center gap-1 text-xs", FOLLOW[follow])}>
          <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">
            {lead.nextStepDate ? `${shortDate(lead.nextStepDate, today)} · ` : ""}
            {lead.nextStep}
          </span>
        </small>
      ) : null}
      <span className="mt-1 flex items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
        <span className="truncate">{lead.ownerName ?? <span className="text-danger">Sin responsable</span>}</span>
        {lead.valueUsdCents ? <span className="font-mono tabular-nums text-foreground">{formatUsdCents(lead.valueUsdCents)}/mes</span> : null}
      </span>
    </>
  );
  return asLink ? (
    <Link href={`/admin/crm/${lead.id}`} draggable={false} className="grid grid-cols-[minmax(0,1fr)] gap-1 pr-6">
      {inner}
    </Link>
  ) : (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1 pr-6">{inner}</div>
  );
}

/**
 * Tarjeta de lead. Con `canEdit` y etapa activa lleva dos formas de moverla
 * sin arrastrar: el menú «Mover a» (teclado, táctil, lector de pantalla) y el
 * asa de arrastre (`draggable`: también se puede con teclado: Espacio para
 * tomarla, flechas para cambiar de columna, Espacio para soltar, Esc para
 * cancelar).
 */
export function LeadCard({
  lead,
  today,
  canEdit,
  saving,
  onMove,
  draggable = false,
}: {
  lead: LeadRow;
  today: string;
  canEdit: boolean;
  saving: boolean;
  onMove: (lead: LeadRow, stage: LeadStageValue) => void;
  draggable?: boolean;
}) {
  const movable = canEdit && isActiveStage(lead.stage);
  const drag = useDraggable({ id: lead.id, disabled: !(draggable && movable) });
  const follow = followUpState(lead.stage, lead.nextStepDate, today);
  const canDrag = draggable && movable;
  // Con el cursor (o el dedo) se toma la tarjeta entera; el teclado solo desde
  // el asa, para que Enter/Espacio en el enlace o en «Mover» no inicien un arrastre.
  const { onKeyDown: handleKeyDown, ...pointerListeners } = (drag.listeners ?? {}) as Record<string, React.EventHandler<never>>;

  return (
    <li
      ref={drag.setNodeRef}
      {...(canDrag ? pointerListeners : {})}
      className={cn(
        "group relative min-w-0 rounded-md border border-border bg-surface p-3 transition-[border-color,opacity] duration-200",
        canDrag && "md:cursor-grab md:select-none md:active:cursor-grabbing",
        saving && "opacity-60",
        drag.isDragging && "opacity-30",
        follow === "overdue" && "border-l-2 border-l-danger",
      )}
    >
      {draggable && movable ? (
        <button
          type="button"
          ref={drag.setActivatorNodeRef}
          onKeyDown={handleKeyDown as React.KeyboardEventHandler}
          {...drag.attributes}
          aria-label={`Arrastrar ${lead.company}`}
          className="absolute left-0 top-0 hidden h-full w-6 cursor-grab items-center justify-center rounded-l-md text-muted-foreground/60 outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:cursor-grabbing md:flex"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      <div className={cn("min-w-0", draggable && movable && "md:pl-4")}>
        <LeadCardBody lead={lead} today={today} />
      </div>
      {movable ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Mover ${lead.company}`} className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground">
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Mover a</DropdownMenuLabel>
            {LEAD_STAGES.filter((s) => isActiveStage(s.value) && s.value !== lead.stage).map((s) => (
              <DropdownMenuItem key={s.value} onSelect={() => onMove(lead, s.value)}>
                <ArrowRight aria-hidden="true" />
                {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <Link href={`/admin/crm/${lead.id}`}>Ganar o perder…</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}

function Column({
  stage,
  label,
  items,
  dragging,
  today,
  canEdit,
  savingIds,
  onMove,
}: {
  stage: LeadStageValue;
  label: string;
  items: LeadRow[];
  /** Lead que se está arrastrando (para resaltar o bloquear la zona). */
  dragging: LeadRow | null;
  today: string;
  canEdit: boolean;
  savingIds: ReadonlySet<string>;
  onMove: (lead: LeadRow, stage: LeadStageValue) => void;
}) {
  const rule = dragging ? dropRule(dragging.stage, stage) : null;
  const blocked = rule !== null && !rule.ok && dragging?.stage !== stage;
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: !canEdit || !isActiveStage(stage) });
  const value = items.reduce((t, l) => t + l.valueUsdCents, 0);

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      data-over={isOver && !blocked ? "" : undefined}
      className={cn(
        "flex min-h-40 min-w-0 flex-col rounded-lg bg-surface-muted p-2.5 outline-2 -outline-offset-2 outline-transparent transition-[outline-color,background-color,opacity] duration-200",
        dragging && !blocked && dragging.stage !== stage && "outline-dashed outline-border-strong",
        isOver && !blocked && "bg-surface outline-solid outline-accent",
        dragging && blocked && dragging.stage !== stage && "opacity-60",
      )}
    >
      <header className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h2 className="truncate text-[12.5px] font-semibold">{label}</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {items.length}
          {value ? ` · ${formatUsdCents(value)}` : ""}
        </span>
      </header>
      {dragging && blocked && dragging.stage !== stage && rule && !rule.ok ? (
        <p className="mb-2 rounded-md border border-dashed border-border-strong px-2 py-1.5 text-[11.5px] text-muted-foreground">{rule.reason}</p>
      ) : null}
      <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2">
        {items.map((l) => (
          <LeadCard key={l.id} lead={l} today={today} canEdit={canEdit} saving={savingIds.has(l.id)} onMove={onMove} draggable />
        ))}
      </ul>
    </section>
  );
}

/** Flechas ← → pasan el lead tomado a la columna vecina (en vez de moverlo 25 px). */
const columnCoordinates: KeyboardCoordinateGetter = (event, { context: { active, droppableRects, droppableContainers, collisionRect } }) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.code) || !active || !collisionRect) return undefined;
  event.preventDefault();
  const columns = droppableContainers
    .getEnabled()
    .map((container) => ({ id: container.id, rect: droppableRects.get(container.id) }))
    .filter((c): c is { id: typeof c.id; rect: NonNullable<typeof c.rect> } => Boolean(c.rect))
    .sort((a, b) => a.rect.left - b.rect.left);
  if (columns.length === 0) return undefined;
  const cx = collisionRect.left + collisionRect.width / 2;
  const currentIndex = columns.findIndex((c) => cx >= c.rect.left && cx <= c.rect.left + c.rect.width);
  const delta = event.code === "ArrowRight" ? 1 : -1;
  const next = columns[Math.min(columns.length - 1, Math.max(0, (currentIndex < 0 ? 0 : currentIndex) + delta))];
  return { x: next.rect.left + 12, y: next.rect.top + 48 };
};

/**
 * Tablero del embudo (escritorio): una columna por etapa; los leads se
 * arrastran entre etapas activas. El arrastre solo cambia la etapa (el orden
 * dentro de la columna sigue siendo por fecha del próximo paso: el modelo no
 * guarda posición). Ganar o perder no se suelta: hay que abrir el lead.
 * Actualización optimista y reversión las gestiona `CrmView`.
 */
export default function LeadBoard({
  leads,
  stages,
  today,
  canEdit,
  savingIds,
  onMove,
}: {
  leads: LeadRow[];
  stages: { value: LeadStageValue; label: string }[];
  today: string;
  canEdit: boolean;
  savingIds: ReadonlySet<string>;
  onMove: (lead: LeadRow, stage: LeadStageValue) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Táctil: mantener 220 ms antes de arrastrar, así no se pelea con el scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates }),
  );
  const dragging = leads.find((l) => l.id === activeId) ?? null;
  const labelOf = (id: unknown) => (typeof id === "string" && LEAD_STAGES.some((s) => s.value === id) ? stageMeta(id as LeadStageValue).label : "fuera de las columnas");
  const nameOf = (id: unknown) => leads.find((l) => l.id === id)?.company ?? "Lead";

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${nameOf(active.id)}. Usa las flechas izquierda y derecha para cambiar de etapa, Espacio para soltar y Escape para cancelar.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} sobre ${labelOf(over.id)}.` : `${nameOf(active.id)} fuera de las columnas.`),
    onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} soltado en ${labelOf(over.id)}.` : `${nameOf(active.id)} soltado sin cambios.`),
    onDragCancel: ({ active }) => `Cancelaste el movimiento de ${nameOf(active.id)}.`,
  };

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }
  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const lead = leads.find((l) => l.id === event.active.id);
    const to = event.over?.id;
    if (!lead || typeof to !== "string") return;
    const stage = to as LeadStageValue;
    if (dropRule(lead.stage, stage).ok) onMove(lead, stage);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "Para mover este lead de etapa, pulsa Espacio, usa las flechas izquierda y derecha y pulsa Espacio otra vez. También puedes usar el menú «Mover a».",
        },
      }}
    >
      <div className="grid auto-cols-[minmax(232px,1fr)] grid-flow-col gap-3">
        {stages.map((s) => (
          <Column
            key={s.value}
            stage={s.value}
            label={s.label}
            items={leads
              .filter((l) => l.stage === s.value)
              .sort((a, b) => (a.nextStepDate ?? "9999").localeCompare(b.nextStepDate ?? "9999"))}
            dragging={dragging}
            today={today}
            canEdit={canEdit}
            savingIds={savingIds}
            onMove={onMove}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: reduced ? 0 : 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {dragging ? (
          <div className="w-[232px] rotate-[1.5deg] rounded-md border border-border-strong bg-surface p-3 shadow-[var(--nx-shadow-overlay)]">
            <LeadCardBody lead={dragging} today={today} asLink={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
