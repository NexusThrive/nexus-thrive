"use client";

/* eslint-disable react-hooks/refs -- useDraggable/useDroppable de dnd-kit devuelven refs de callback y listeners, no valores de ref; el lint los confunde. */

import { useEffect, useId, useState } from "react";
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
import { ArrowDown, ArrowRight, ArrowUp, CalendarClock, Check, X, Columns3, ExternalLink, GripVertical, MoreHorizontal, Plus, ShoppingBag, Target } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Select } from "@/components/atoms/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { useReducedMotion } from "@/lib/experience/hooks/use-reduced-motion";
import type { PipelineCard, PipelineStage } from "@/lib/business/growth/pipeline-db";
import type { PickerCustomer } from "@/lib/business/growth/pipeline-read";
import { cardChip, columnBar, shortMoney } from "@/lib/business/growth/pipeline";
import { cn } from "@/lib/utils";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
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
          <CustomerAvatar identity={card.customer} className="size-5 rounded-md" />
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
  canConfig,
  onRename,
}: {
  canConfig: boolean;
  onRename: (stage: PipelineStage, name: string) => void;
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
  // El encabezado se arrastra para reordenar las etapas (Ganado se queda al final); con teclado, en Configuración.
  const head = useDraggable({ id: `col:${stage.id}`, disabled: !canConfig || stage.isWon });
  const { onKeyDown: _headKeys, ...headPointer } = (head.listeners ?? {}) as Record<string, React.EventHandler<never>>;
  void _headKeys;
  const [renaming, setRenaming] = useState(false);
  const total = cards.reduce((t, c) => t + c.value, 0);
  const bar = columnBar(cards, now);
  const target = dragging && dragging.stageId !== stage.id;
  return (
    <section
      ref={setNodeRef}
      aria-label={stage.name}
      className={cn("flex w-[300px] shrink-0 flex-col gap-3 rounded-xl outline-2 -outline-offset-2 outline-transparent transition-[outline-color] duration-(--d1)", target && "outline-dashed outline-border-strong", isOver && target && "outline-solid outline-accent")}
    >
      <header ref={head.setNodeRef} {...(canConfig && !stage.isWon && !renaming ? headPointer : {})} className={cn("flex items-center gap-2 px-0.5", canConfig && !stage.isWon && "cursor-grab active:cursor-grabbing", head.isDragging && "opacity-40")}>
        {renaming ? (
          <input
            autoFocus
            aria-label={`Nuevo nombre de la etapa ${stage.name}`}
            defaultValue={stage.name}
            maxLength={40}
            className="h-7 min-w-0 flex-1 rounded-lg border border-accent bg-background px-2 text-base font-semibold text-foreground outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(false);
            }}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              setRenaming(false);
              if (v && v !== stage.name) onRename(stage, v);
            }}
          />
        ) : (
          <h2 className="min-w-0 truncate text-base font-semibold text-foreground">
            {canConfig ? (
              <button
                type="button"
                onDoubleClick={() => setRenaming(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "F2") {
                    e.preventDefault();
                    setRenaming(true);
                  }
                }}
                aria-describedby="crm-rename-hint"
                className="max-w-full truncate rounded text-left outline-none focus-visible:outline-2 focus-visible:outline-ring"
              >
                {stage.name}
              </button>
            ) : (
              stage.name
            )}
          </h2>
        )}
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

/**
 * Columna de nueva etapa (se abre con «+ Etapa»): nombre con ✓ y ✕, probabilidad por defecto y después de qué etapa va. Enter crea,
 * Esc cancela; Ganado siempre queda al final. Debajo, tres tarjetas fantasma de dónde aparecerán sus oportunidades.
 */
function NewStageColumn({ stages, onCreate, onCancel }: { stages: PipelineStage[]; onCreate: (name: string, probability: number, afterId: string | null) => Promise<unknown>; onCancel: () => void }) {
  const open = stages.filter((s) => !s.isWon);
  const [name, setName] = useState("");
  const [prob, setProb] = useState("30 %");
  const [after, setAfter] = useState(open.at(-1)?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errId = useId();
  // Esc cancela esté donde esté el foco (salvo dentro de un menú o diálogo abierto, que se cierran primero).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || (e.target as HTMLElement | null)?.closest("[role=dialog],[role=listbox],[role=menu]")) return;
      onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  const submit = async () => {
    const n = name.trim();
    const p = Number(prob.replace(/[^\d]/g, ""));
    if (n.length < 2) return setError("Escribe el nombre de la etapa.");
    if (stages.some((s) => s.name.trim().toLocaleLowerCase("es") === n.toLocaleLowerCase("es"))) return setError("Ya hay una etapa con ese nombre.");
    if (!prob.trim() || !(p >= 0 && p <= 100)) return setError("La probabilidad va de 0 a 100.");
    setBusy(true);
    await onCreate(n, p, after || null);
    setBusy(false);
  };
  const square = "grid h-9 w-[34px] shrink-0 place-items-center rounded-lg border border-border outline-none focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";
  return (
    <section aria-label="Nueva etapa" className="flex w-[300px] shrink-0 flex-col gap-3">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-3 rounded-xl border border-accent bg-card p-3.5 shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_12%,transparent)]"
      >
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={40}
            aria-label="Nombre de la etapa"
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            placeholder="Nombre de la etapa *"
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-ui font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_15%,transparent)] aria-[invalid=true]:border-danger"
          />
          <button type="submit" disabled={busy} aria-label="Crear etapa" className={cn(square, "text-success hover:border-success hover:bg-success-subtle")}>
            <Check aria-hidden="true" className="size-[15px]" strokeWidth={2.4} />
          </button>
          <button type="button" onClick={onCancel} aria-label="Cancelar" className={cn(square, "text-danger hover:border-danger/60 hover:bg-danger-subtle")}>
            <X aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
          </button>
        </div>
        {error ? (
          <p id={errId} role="alert" className="-mt-1 text-xs text-danger">
            {error}
          </p>
        ) : null}
        <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          Probabilidad por defecto
          <input
            value={prob}
            inputMode="numeric"
            onChange={(e) => setProb(e.target.value)}
            onBlur={(e) => {
              const p = e.currentTarget.value.replace(/[^\d]/g, "");
              if (p) setProb(`${Math.min(100, Number(p))} %`);
            }}
            className="h-9 w-[84px] rounded-lg border border-border bg-background px-2.5 text-right text-ui text-foreground outline-none focus:border-accent"
          />
        </label>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span id={`${errId}-pos`}>Colocar después de</span>
          <Select aria-labelledby={`${errId}-pos`} value={after} onChange={(e) => setAfter(e.target.value)} className="h-9 w-[140px] text-ui">
            {[...open].reverse().map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-2xs text-muted-foreground">Enter para crear · Esc para cancelar. Ganado siempre queda al final.</p>
      </form>
      {[1, 0.7, 0.45].map((o) => (
        <div key={o} aria-hidden="true" className="h-[92px] rounded-xl border border-dashed border-border bg-background" style={{ opacity: o }} />
      ))}
      <p className="text-center text-xs text-muted-foreground">Aquí aparecerán las oportunidades de esta etapa</p>
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
  canConfig = false,
  onCreateStage,
  onRenameStage,
  onReorderStages,
}: {
  canConfig?: boolean;
  onCreateStage?: (name: string, probability: number, afterId: string | null) => Promise<boolean>;
  onRenameStage?: (stage: PipelineStage, name: string) => void;
  onReorderStages?: (ids: string[]) => void;
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
  const [addingStage, setAddingStage] = useState(false);
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
  const nameOf = (id: unknown) => (String(id).startsWith("col:") ? `la etapa ${stages.find((s) => `col:${s.id}` === id)?.name ?? ""}` : (cards.find((c) => c.id === id)?.name ?? "Oportunidad"));
  const draggingStage = activeId?.startsWith("col:") ? (stages.find((s) => `col:${s.id}` === activeId) ?? null) : null;
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
    // Encabezado de una etapa soltado sobre otra columna: queda en su lugar (Ganado sigue al final).
    if (String(event.active.id).startsWith("col:")) {
      const from = String(event.active.id).slice(4);
      const over = String(event.over?.id ?? "");
      const to = over.startsWith("stage:") ? over.slice(6) : cards.find((c) => `card:${c.id}` === over)?.stageId;
      if (!to || to === from) return;
      const ids = stages.filter((s) => !s.isWon).map((s) => s.id);
      const target = ids.indexOf(to);
      if (target < 0) return;
      const without = ids.filter((id) => id !== from);
      without.splice(target, 0, from);
      onReorderStages?.(without);
      return;
    }
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
        <span id="crm-rename-hint" hidden>
          Doble clic o Enter para renombrar la etapa
        </span>
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
              canConfig={canConfig}
              onRename={(stage, name) => onRenameStage?.(stage, name)}
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
            {canConfig ? (
              <button type="button" aria-expanded={addingStage} onClick={() => setAddingStage(true)} className="grid h-9 place-items-center rounded-[10px] border border-dashed border-border-strong text-ui text-muted-foreground outline-none hover:border-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                + Etapa
              </button>
            ) : null}
          </section>
          {addingStage && onCreateStage ? <NewStageColumn stages={stages} onCancel={() => setAddingStage(false)} onCreate={async (n, p, after) => (await onCreateStage(n, p, after)) && setAddingStage(false)} /> : null}
        </div>
        {empty ? (
          <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center px-5">
            <div className="pointer-events-auto grid w-full max-w-xl justify-items-center gap-5 rounded-xl border border-border bg-card px-6 py-7 text-center shadow-[var(--nx-shadow-overlay)]">
              <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl border border-border bg-background text-accent-text">
                <Target className="size-6" />
              </span>
              <div className="grid gap-2">
                <h2 className="font-display text-xl font-semibold text-foreground">Crea tu primera oportunidad</h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">Anota a quién le estás vendiendo, cuánto vale y cuál es el siguiente paso. El pipeline te dice qué atender hoy.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={() => onQuick("first")} className={buttonVariants({ variant: "accent", size: "sm", className: "nx-flash h-[34px] font-semibold" })}>
                  Nueva oportunidad
                </button>
                <Link href={`/${slug}/data`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border")}>
                  Importar contactos
                </Link>
              </div>
              <ul className="grid w-full gap-2.5 text-left sm:grid-cols-3">
                {[
                  { icon: Columns3, title: "Etapas a tu medida", text: "Arrastra cada trato al avanzar." },
                  { icon: CalendarClock, title: "Siguiente paso", text: "Llamadas y reuniones con fecha." },
                  { icon: ShoppingBag, title: "Ganas y se vende", text: "Se crea el pedido y su cobro." },
                ].map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-2.5 rounded-lg border border-border bg-background p-3 sm:flex-col sm:gap-2">
                    <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-muted text-accent-text">
                      <Icon className="size-4" />
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-ui font-medium text-foreground">{title}</span>
                      <span className="text-xs text-muted-foreground">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
      <DragOverlay dropAnimation={{ duration: reduced ? 0 : 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {draggingStage ? (
          <div className="flex w-[300px] items-center gap-2 rounded-xl border border-accent bg-card px-3 py-2 shadow-[var(--nx-shadow-overlay)]">
            <span className="text-base font-semibold text-foreground">{draggingStage.name}</span>
          </div>
        ) : dragging ? (
          <div className="flex w-[300px] rotate-[1.5deg] flex-col gap-2.5 rounded-xl border border-accent bg-card p-3.5 shadow-[var(--nx-shadow-overlay)]">
            <CardBody card={dragging} now={now} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
