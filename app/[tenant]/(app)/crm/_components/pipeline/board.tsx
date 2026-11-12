"use client";

/* eslint-disable react-hooks/refs -- useDraggable/useDroppable de dnd-kit devuelven refs de callback y listeners, no valores de ref; el lint los confunde. */

import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { ArrowDown, ArrowRight, ArrowUp, CalendarClock, Columns3, ExternalLink, GripVertical, MoreHorizontal, Plus, Search, ShoppingBag, Target } from "lucide-react";
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
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";

/** Función con identidad fija que siempre llama a la última versión: las tarjetas memorizadas no se repintan por callbacks nuevos. */
function useStable<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}

/** Contenido de una tarjeta (lo comparten la tarjeta y la vista previa del arrastre). */
function CardBody({ card, now }: { card: PipelineCard; now: number }) {
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        {card.customer ? (
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <CustomerAvatar identity={card.customer} className="size-6 rounded-full" />
            <span className="truncate">{card.customer.name}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Sin cliente</span>
        )}
        {card.owner ? (
          <span title={`Responsable: ${card.owner.name}`}>
            <Initials name={card.owner.name} id={card.owner.id} size={24} className="rounded-full" />
            <span className="sr-only">Responsable: {card.owner.name}</span>
          </span>
        ) : null}
      </span>
      <span className="text-ui font-medium leading-snug text-foreground">{card.name}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <Stars value={card.priority} />
        <ActivityChip chip={cardChip(card, now)} />
        <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">{shortMoney(card.value)}</span>
        <span className="text-2xs text-muted-foreground">{card.probability} %</span>
      </span>
      {card.tags.length ? (
        <span className="flex flex-wrap gap-1.5">
          {card.tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-2xs text-foreground">
              {t}
            </span>
          ))}
        </span>
      ) : null}
    </>
  );
}

/**
 * Contenido de la tarjeta (abrir y menú). Va memorizado: dnd-kit vuelve a pintar cada arrastrable en cada movimiento del puntero y
 * así solo se repinta el `li`, no el menú de cada tarjeta.
 */
const CardContent = memo(function CardContent({
  slug,
  card,
  stages,
  now,
  index,
  count,
  onMove,
  onShift,
  onOpen,
}: {
  slug: string;
  card: PipelineCard;
  stages: PipelineStage[];
  now: number;
  index: number;
  count: number;
  onMove: (card: PipelineCard, stageId: string) => void;
  onShift: (card: PipelineCard, delta: -1 | 1) => void;
  onOpen: (card: PipelineCard) => void;
}) {
  const movable = true;
  return (
    <>
      <button type="button" draggable={false} onClick={() => onOpen(card)} aria-haspopup="dialog" className="flex w-full flex-col gap-3 rounded-3xl p-4 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <CardBody card={card} now={now} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`Opciones de ${card.name}`} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-muted-foreground opacity-0 outline-none hover:bg-surface-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring group-hover:opacity-100 data-[state=open]:opacity-100">
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
              Abrir completa
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
});

/**
 * Tarjeta: al pulsarla abre el panel lateral con el detalle. Se toma entera con el cursor (6 px) o el dedo (mantener 220 ms); con teclado, desde el asa. El menú
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
  onOpen,
  collapsed,
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
  onOpen: (card: PipelineCard) => void;
  /** Se está arrastrando a otro lugar: su sitio se cierra y el hueco lo marca el indicador de destino. */
  collapsed: boolean;
}) {
  // Las ganadas también se mueven: sacarlas de Ganado las reabre (el pedido ya creado se conserva).
  const movable = true;
  const drag = useDraggable({ id: card.id, disabled: !movable });
  const { onKeyDown: handleKeyDown, ...pointerListeners } = (drag.listeners ?? {}) as Record<string, React.EventHandler<never>>;
  return (
    <li
      ref={drag.setNodeRef}
      {...(movable ? pointerListeners : {})}
      data-card-id={card.id}
      className={cn(
        collapsed && "hidden",
        "group relative rounded-3xl border border-border/60 bg-card transition-[border-color,background-color,opacity] duration-(--d1) hover:border-accent/60 hover:bg-accent-subtle/30 motion-reduce:transition-none",
        movable && "cursor-grab select-none active:cursor-grabbing",
        card.won && "border-l-2 border-l-success",
        saving && "opacity-60",
        drag.isDragging && "opacity-30",
      )}
    >
      {movable ? (
        <button
          type="button"
          ref={drag.setActivatorNodeRef}
          onKeyDown={handleKeyDown as React.KeyboardEventHandler}
          {...drag.attributes}
          aria-label={`Arrastrar ${card.name}`}
          className="absolute left-0 top-0 hidden h-full w-6 cursor-grab items-center justify-center rounded-l-3xl text-muted-foreground opacity-0 outline-none transition-opacity duration-(--d1) hover:bg-surface-muted focus-visible:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring group-hover:opacity-100 md:flex"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      <CardContent slug={slug} card={card} stages={stages} now={now} index={index} count={count} onMove={onMove} onShift={onShift} onOpen={onOpen} />
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
  onOpen,
  gap,
  ghostHeight,
  draggingId,
  held = false,
  canConfig,
  onRename,
  sample = false,
  sampleIndex = 0,
}: {
  /** Tablero vacío: muestra tarjetas de ejemplo desenfocadas bajo el título. */
  sample?: boolean;
  sampleIndex?: number;
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
  onOpen: (card: PipelineCard) => void;
  /** Hueco de destino de la tarjeta que se sostiene (solo en la columna donde caería) y alto del indicador. */
  gap: Gap | null;
  ghostHeight: number;
  draggingId: string | null;
  /** Es la etapa que se está arrastrando a otro lugar: su sitio se cierra y el hueco punteado marca adónde irá. */
  held?: boolean;
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
      data-stage-id={stage.id}
      data-stage-won={stage.isWon ? "true" : "false"}
      className={cn(held && "hidden", "flex w-[300px] shrink-0 flex-col gap-3 rounded-3xl transition-[background-color,box-shadow] duration-(--d2) motion-reduce:transition-none", target && "bg-surface-muted/50 shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--border-strong)_55%,transparent)]", isOver && target && "bg-accent-subtle/40 shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--accent)_45%,transparent)]")}
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
          <h2 className="flex min-w-0 items-center gap-1.5 truncate text-ui font-semibold text-foreground">
            {canConfig && !stage.isWon ? <GripVertical aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/60" /> : null}
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
                className="max-w-full truncate rounded-xs text-left outline-none focus-visible:outline-2 focus-visible:outline-ring"
              >
                {stage.name}
              </button>
            ) : (
              stage.name
            )}
          </h2>
        )}
        <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-muted-foreground" aria-label={`${cards.length} oportunidades`}>
          {cards.length}
        </span>
        <span className="ms-auto text-ui text-muted-foreground tabular-nums">{shortMoney(total)}</span>
        <button
          type="button"
          onClick={onOpenQuick}
          aria-label={`Agregar a ${stage.name}`}
          className="grid size-8 place-items-center rounded-full bg-surface-muted text-muted-foreground outline-none transition-colors duration-(--d1) hover:bg-accent-subtle hover:text-accent-text focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </header>
      <div aria-hidden="true" className="mx-0.5 mb-0.5 flex h-1 overflow-hidden rounded-full bg-border/50">
        <i className="block h-full bg-success" style={{ width: `${bar.planned}%` }} />
        <i className="block h-full bg-gold-300" style={{ width: `${bar.today}%` }} />
        <i className="block h-full bg-danger" style={{ width: `${bar.overdue}%` }} />
        <i className="block h-full bg-border-strong" style={{ width: `${bar.none}%` }} />
      </div>
      {quick ? <QuickCreate slug={slug} stageId={stage.id} preset={preset} onClose={onCloseQuick} /> : null}
      {sample ? <SampleCards index={sampleIndex} /> : null}
      <ul className="flex min-h-16 flex-col gap-3">
        {(() => {
          // Con el hueco abierto: el indicador de destino ocupa su lugar entre las tarjetas y las de abajo se corren (el hueco crece con una
          // transición corta); la tarjeta sostenida cierra su sitio. El índice del hueco no cuenta a la sostenida.
          const here = gap && gap.stageId === stage.id ? gap.index : null;
          const out: React.ReactNode[] = [];
          let k = 0;
          cards.forEach((c, i) => {
            const held = gap !== null && c.id === draggingId;
            if (!held && here === k) out.push(<li key="gap" aria-hidden="true" data-gap="" className="nx-gap rounded-3xl border-2 border-dashed border-accent/50 bg-accent-subtle/40" style={{ height: ghostHeight }} />);
            out.push(<Card key={c.id} slug={slug} card={c} stages={stages} now={now} saving={savingIds.has(c.id)} index={i} count={cards.length} onMove={onMove} onShift={onShift} onOpen={onOpen} collapsed={held} />);
            if (!held) k++;
          });
          if (here !== null && here >= k) out.push(<li key="gap" aria-hidden="true" data-gap="" className="nx-gap rounded-3xl border-2 border-dashed border-accent/50 bg-accent-subtle/40" style={{ height: ghostHeight }} />);
          return out;
        })()}
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
  const formId = `${errId}-form`;
  const label = "text-xs font-medium text-muted-foreground";
  const field = "h-11 w-full rounded-2xl border border-border/60 bg-background px-4 text-ui text-foreground outline-none placeholder:text-muted-foreground focus:border-accent";
  return (
    <ResponsiveSheet
      open
      onOpenChange={(next) => !next && onCancel()}
      title="Nueva etapa"
      description="Una columna más en tu pipeline. «Ganado» siempre queda al final."
      size="sm"
      initialFocus="field"
      footer={
        <>
          <button type="button" onClick={onCancel} className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full border-border/60 bg-transparent px-5")}>
            Cancelar
          </button>
          <button type="submit" form={formId} disabled={busy} className={cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold")}>
            {busy ? "Creando…" : "Crear etapa"}
          </button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="grid gap-4"
      >
        <label className="grid gap-1.5">
          <span className={label}>
            Nombre de la etapa <span aria-hidden="true">*</span>
          </span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={40}
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            placeholder="Ej. Negociación"
            className={cn(field, "h-12 text-base font-medium")}
          />
          {error ? (
            <p id={errId} role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={label}>Probabilidad por defecto</span>
            <input
              value={prob}
              inputMode="numeric"
              onChange={(e) => setProb(e.target.value)}
              onBlur={(e) => {
                const p = e.currentTarget.value.replace(/[^\d]/g, "");
                if (p) setProb(`${Math.min(100, Number(p))} %`);
              }}
              className={field}
            />
          </label>
          <div className="grid gap-1.5">
            <span id={`${errId}-pos`} className={label}>
              Colocar después de
            </span>
            <Select aria-labelledby={`${errId}-pos`} value={after} onChange={(e) => setAfter(e.target.value)} className="h-11 rounded-2xl text-ui">
              {[...open].reverse().map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Enter crea la etapa · Esc cancela</p>
      </form>
    </ResponsiveSheet>
  );
}

/** Tarjetas de ejemplo para el tablero vacío: lo que verá cuando haya oportunidades (por etapa). */
const SAMPLE_CARDS: { name: string; customer: string; value: string; probability: number; tag?: string }[][] = [
  [
    { name: "Dotación para el colegio", customer: "Colegio San José", value: "$ 4,8 M", probability: 20, tag: "Mayorista" },
    { name: "Uniformes deportivos", customer: "Liga de Natación", value: "$ 2,1 M", probability: 20 },
    { name: "Pedido de temporada", customer: "Tienda Moda Centro", value: "$ 950 mil", probability: 10 },
    { name: "Camisetas para el torneo", customer: "Club Deportivo Norte", value: "$ 1,6 M", probability: 15 },
    { name: "Catálogo corporativo", customer: "Andrés Torres", value: "$ 3,2 M", probability: 10 },
  ],
  [
    { name: "Eventos de fin de año", customer: "Banco Gran Caribe", value: "$ 12 M", probability: 45, tag: "Empresa" },
    { name: "Dotación hotelera", customer: "Hotel Marbella", value: "$ 6,3 M", probability: 40 },
    { name: "Uniformes de planta", customer: "Panadería La Esquina", value: "$ 2,7 M", probability: 50 },
    { name: "Material para feria", customer: "Cámara de Comercio", value: "$ 7,5 M", probability: 35, tag: "Evento" },
  ],
  [
    { name: "Renovación de contrato", customer: "Fundación Cartagena", value: "$ 3,4 M", probability: 70 },
    { name: "Cotización de equipos", customer: "Clínica del Prado", value: "$ 8,9 M", probability: 65, tag: "Urgente" },
    { name: "Pedido recurrente", customer: "Valentina Ruiz", value: "$ 1,2 M", probability: 75 },
  ],
  [
    { name: "Alianza con proveedor", customer: "Distribuidora Andina", value: "$ 5,6 M", probability: 100 },
    { name: "Dotación del gimnasio", customer: "Gym Center", value: "$ 3,9 M", probability: 100 },
  ],
  [
    { name: "Compra por mayor", customer: "Ferretería El Tornillo", value: "$ 2,3 M", probability: 0 },
    { name: "Cotización de vallas", customer: "Inmobiliaria del Sur", value: "$ 4,1 M", probability: 0 },
  ],
];

/**
 * Tarjetas de ejemplo bajo el título de una columna del tablero vacío (como la tabla de ejemplo de Contactos): la columna se ve como
 * quedará con oportunidades, a lo largo, desenfocada y desvaneciéndose hacia abajo. Decorativa: sin foco, clics ni lector.
 */
function SampleCards({ index }: { index: number }) {
  const mask = "linear-gradient(to bottom, #000 0%, rgba(0,0,0,.55) 55%, transparent 100%)";
  return (
    <ul
      aria-hidden="true"
      inert
      className="pointer-events-none flex select-none flex-col gap-3"
      style={{ maskImage: mask, WebkitMaskImage: mask, filter: "blur(1.5px)", opacity: 0.55 }}
    >
      {(SAMPLE_CARDS[index] ?? []).map((c) => (
        <li key={c.name} className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-4">
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <CustomerAvatar identity={{ name: c.customer }} className="size-6 rounded-full" />
            <span className="truncate">{c.customer}</span>
          </span>
          <span className="text-ui font-medium leading-snug text-foreground">{c.name}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">{c.value}</span>
            <span className="text-2xs text-muted-foreground">{c.probability} %</span>
            {c.tag ? <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-2xs text-foreground">{c.tag}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Dónde caería la tarjeta que se sostiene: la columna bajo su centro y el lugar (entre qué tarjetas), con las posiciones actuales del DOM. */
type Gap = { stageId: string; index: number };
function gapAt(event: DragMoveEvent, draggingId: string): Gap | null {
  const rect = event.active.rect.current.translated;
  if (!rect) return null;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const column = Array.from(document.querySelectorAll<HTMLElement>("[data-stage-id]")).find((el) => {
    const r = el.getBoundingClientRect();
    return cx >= r.left && cx <= r.right;
  });
  if (!column) return null;
  const items = Array.from(column.querySelectorAll<HTMLElement>("[data-card-id]")).filter((el) => el.dataset.cardId !== draggingId);
  let index = items.length;
  for (let i = 0; i < items.length; i++) {
    const r = items[i]!.getBoundingClientRect();
    if (cy < r.top + r.height / 2) {
      index = i;
      break;
    }
  }
  return { stageId: column.dataset.stageId!, index };
}

/** Dónde caería la etapa que se sostiene: entre qué columnas (sin contar Ganado, que siempre queda al final ni la sostenida). */
function colGapAt(event: DragMoveEvent, fromId: string): number | null {
  const rect = event.active.rect.current.translated;
  if (!rect) return null;
  const cx = rect.left + rect.width / 2;
  const cols = Array.from(document.querySelectorAll<HTMLElement>("[data-stage-id]")).filter((el) => el.dataset.stageId !== fromId && el.dataset.stageWon !== "true");
  let index = cols.length;
  for (let i = 0; i < cols.length; i++) {
    const r = cols[i]!.getBoundingClientRect();
    if (cx < r.left + r.width / 2) {
      index = i;
      break;
    }
  }
  return index;
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
  onOpen,
  noMatch = false,
  onClearFilters,
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
  onMove: (card: PipelineCard, stageId: string, index?: number) => void;
  onReorder: (stageId: string, ids: string[]) => void;
  onShowLost: () => void;
  /** Pulsar una tarjeta: abre el panel lateral con su detalle. */
  onOpen: (card: PipelineCard) => void;
  /** Hay oportunidades en el negocio, pero ninguna coincide con la búsqueda o el filtro actual (p. ej. «Mis oportunidades»). */
  noMatch?: boolean;
  onClearFilters?: () => void;
}) {
  const stableMove = useStable(onMove);
  const stableOpen = useStable(onOpen);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [gap, setGap] = useState<Gap | null>(null);
  const [colGap, setColGap] = useState<number | null>(null);
  const [ghostHeight, setGhostHeight] = useState(96);
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

  const stableShift = useStable(shift);

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    const card = cards.find((c) => c.id === event.active.id);
    if (card) setGhostHeight(Math.round(event.active.rect.current.initial?.height ?? 96));
  }
  function onDragMove(event: DragMoveEvent) {
    const id = String(event.active.id);
    if (id.startsWith("col:")) {
      const nextCol = colGapAt(event, id.slice(4));
      setColGap((prev) => (prev === nextCol ? prev : nextCol));
      return;
    }
    const next = gapAt(event, id);
    setGap((prev) => (prev?.stageId === next?.stageId && prev?.index === next?.index ? prev : next));
  }

  function onDragEnd(event: DragEndEvent) {
    const landing = gap;
    const landingCol = colGap;
    setActiveId(null);
    setGap(null);
    setColGap(null);
    // Encabezado de una etapa: cae donde estaba el hueco punteado (Ganado sigue al final).
    if (String(event.active.id).startsWith("col:")) {
      const from = String(event.active.id).slice(4);
      if (landingCol === null) return;
      const before = stages.filter((st) => !st.isWon).map((st) => st.id);
      const ids = before.filter((id) => id !== from);
      ids.splice(Math.min(landingCol, ids.length), 0, from);
      if (ids.join() !== before.join()) onReorderStages?.(ids);
      return;
    }
    const card = cards.find((c) => c.id === event.active.id);
    // Cae donde estaba el indicador: misma columna → se reordena exacto; otra columna → pasa a esa etapa en ese lugar.
    if (card && landing) {
      if (landing.stageId === card.stageId) {
        const ids = byStage(card.stageId).map((c) => c.id).filter((id) => id !== card.id);
        ids.splice(landing.index, 0, card.id);
        const before = byStage(card.stageId).map((c) => c.id);
        if (ids.join() !== before.join()) onReorder(card.stageId, ids);
      } else {
        onMove(card, landing.stageId, landing.index);
      }
      return;
    }
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
      id="crm-pipeline"
      sensors={sensors}
      // Los destinos se miden una vez al tomar la tarjeta: el hueco punteado mueve el diseño en cada cambio y medirlos todos de nuevo era el tirón.
      measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setGap(null);
        setColGap(null);
      }}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: "Para mover esta oportunidad de etapa, pulsa Espacio, usa las flechas izquierda y derecha y pulsa Espacio otra vez. También puedes usar su menú «Mover a»." },
      }}
    >
      <div className="relative">
        <span id="crm-rename-hint" hidden>
          Doble clic o Enter para renombrar la etapa
        </span>
        {/* Las columnas se estiran hasta abajo: al sostener una oportunidad, el recuadro de cada etapa cubre todo el alto y se puede soltar en cualquier punto. */}
        <div className="flex min-h-[calc(100dvh-22rem)] items-stretch gap-4 overflow-x-auto px-5 pb-6 pt-1">
          {(() => {
            // Con una etapa sostenida: su sitio se cierra y un hueco punteado con su nombre marca dónde quedará; las demás se corren.
            const out: React.ReactNode[] = [];
            let k = 0;
            let placed = false;
            const gapColumn = draggingStage ? (
              <div key="col-gap" aria-hidden="true" data-col-gap="" className="nx-gap-x flex w-[300px] shrink-0 flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-accent/50 bg-accent-subtle/40 px-4 pt-8 text-center">
                <GripVertical aria-hidden="true" className="size-5 text-accent-text" />
                <span className="text-ui font-medium text-accent-text">Aquí queda «{draggingStage.name}»</span>
              </div>
            ) : null;
            stages.forEach((s, i) => {
              const heldStage = colGap !== null && draggingStage?.id === s.id;
              if (gapColumn && colGap !== null && !placed && !heldStage && (s.isWon || k === colGap)) {
                out.push(gapColumn);
                placed = true;
              }
              out.push(
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
                  onMove={stableMove}
                  onShift={stableShift}
                  onOpen={stableOpen}
                  gap={gap}
                  ghostHeight={ghostHeight}
                  draggingId={activeId}
                  held={heldStage}
                  canConfig={canConfig}
                  onRename={(stage, name) => onRenameStage?.(stage, name)}
                  sample={empty}
                  sampleIndex={i < 4 ? i : i % 3}
                />,
              );
              if (!heldStage && !s.isWon) k++;
            });
            if (gapColumn && colGap !== null && !placed) out.push(gapColumn);
            return out;
          })()}
          <section aria-label="Perdidos y nueva etapa" className="flex w-[300px] shrink-0 flex-col gap-3">
            <header className="flex items-center gap-2 px-0.5">
              <h2 className="text-ui font-semibold text-muted-foreground">Perdidos</h2>
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-muted-foreground">{lost.count}</span>
            </header>
            <button type="button" onClick={onShowLost} className="flex flex-col items-start gap-1.5 rounded-3xl border border-border/60 bg-card p-4 text-left outline-none hover:border-accent/60 hover:bg-accent-subtle/30 focus-visible:outline-2 focus-visible:outline-ring">
              <span className="text-ui text-muted-foreground">Ver oportunidades perdidas</span>
              <span className="text-xs text-muted-foreground tabular-nums">{shortMoney(lost.total)}</span>
            </button>
            {empty ? <SampleCards index={SAMPLE_CARDS.length - 1} /> : null}
            {canConfig ? (
              <button type="button" aria-expanded={addingStage} onClick={() => setAddingStage(true)} className="grid h-11 place-items-center rounded-full border border-dashed border-border-strong text-ui text-muted-foreground outline-none hover:border-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                + Etapa
              </button>
            ) : null}
          </section>
          {addingStage && onCreateStage ? <NewStageColumn stages={stages} onCancel={() => setAddingStage(false)} onCreate={async (n, p, after) => (await onCreateStage(n, p, after)) && setAddingStage(false)} /> : null}
        </div>
        {noMatch && !empty ? (
          <div className="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center px-5">
            <div role="status" className="pointer-events-auto grid w-full max-w-lg justify-items-center gap-5 rounded-sheet border border-border/60 bg-card/95 px-8 py-9 text-center shadow-overlay backdrop-blur-sm">
              <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-accent-subtle text-accent-text ring-8 ring-accent-subtle/40">
                <Search className="size-6" />
              </span>
              <div className="grid gap-2">
                <h2 className="font-display text-xl font-medium tracking-tight text-foreground">Ninguna oportunidad coincide</h2>
                <p className="mx-auto max-w-sm text-ui text-muted-foreground">Hay oportunidades en tu pipeline, pero la búsqueda o el filtro actual las oculta. Quita los filtros para verlas todas.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={onClearFilters} className={cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold")}>
                  Ver todas
                </button>
                <button type="button" onClick={() => onQuick("first")} className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full border-border/60 px-6")}>
                  <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
                  Nueva oportunidad
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {empty ? (
          <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-5">
            <div className="pointer-events-auto grid w-full max-w-2xl justify-items-center gap-6 rounded-sheet border border-border/60 bg-card/95 px-8 py-10 text-center shadow-overlay backdrop-blur-sm">
              <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-accent-subtle text-accent-text ring-8 ring-accent-subtle/40">
                <Target className="size-7" />
              </span>
              <div className="grid gap-2">
                <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">Crea tu primera oportunidad</h2>
                <p className="mx-auto max-w-md text-base text-muted-foreground">Anota a quién le estás vendiendo, cuánto vale y cuál es el siguiente paso. El pipeline te dice qué atender hoy.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={() => onQuick("first")} className={cn(buttonVariants({ variant: "accent" }), "nx-flash h-12 rounded-full px-7 text-sm font-semibold")}>
                  <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
                  Nueva oportunidad
                </button>
                <Link href={`/${slug}/data`} className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-full border-border/60 px-6")}>
                  Importar contactos
                </Link>
              </div>
              <ul className="grid w-full gap-3 text-left sm:grid-cols-3">
                {[
                  { icon: Columns3, title: "Etapas a tu medida", text: "Arrastra cada trato al avanzar." },
                  { icon: CalendarClock, title: "Siguiente paso", text: "Llamadas y reuniones con fecha." },
                  { icon: ShoppingBag, title: "Ganas y se vende", text: "Se crea el pedido y su cobro." },
                ].map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-3 rounded-3xl bg-surface-muted/60 p-4 sm:flex-col">
                    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-accent-text">
                      <Icon className="size-[18px]" strokeWidth={1.6} />
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
          <div className="grid w-[300px] gap-1.5 rounded-3xl border border-accent/60 bg-card p-4 ring-4 ring-accent/15 shadow-overlay">
            <span className="flex items-center gap-2 text-ui font-semibold text-foreground">
              <GripVertical aria-hidden="true" className="size-4 text-accent-text" />
              {draggingStage.name}
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground">{byStage(draggingStage.id).length}</span>
            </span>
            <span className="text-xs text-muted-foreground">Suéltala entre dos etapas. «Ganado» siempre queda al final.</span>
          </div>
        ) : dragging ? (
          <div className="flex w-[300px] rotate-[1.5deg] flex-col gap-3 rounded-3xl border border-accent/60 bg-card p-4 ring-4 ring-accent/15 shadow-overlay">
            <CardBody card={dragging} now={now} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
