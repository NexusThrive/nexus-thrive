"use client";

/* eslint-disable react-hooks/refs -- useDraggable/useDroppable de dnd-kit devuelven refs de callback y listeners, no valores de ref; el lint los confunde. */

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { ArrowDown, ArrowUp, Check, Eye, GripVertical, LayoutDashboard, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Select } from "@/components/atoms/select";
import { Switch } from "@/components/atoms/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { ChartWidget } from "@/components/molecules/charts/chart-widget";
import { AddWidgetPanel } from "@/components/organisms/add-widget-panel";
import { entryOf, type ChartData, type ChartEntry, type ChartType } from "@/lib/dashboard/chart-catalog";
import {
  MIN_SPAN,
  SPANS,
  spanLabel,
  addWidget,
  COLS,
  clampHeight,
  defaultLayout,
  isCustomized,
  fromTwelfths,
  isSpan,
  moveWidget,
  normalizeLayout,
  placeWidget,
  removeWidget,
  setHeight,
  setSpan,
  spanFromWidth,
  stepSpan,
  toggleWidget,
  type DashboardLayout,
  type Span,
} from "@/lib/dashboard/layout";
import { EASE_OUT, motionOff } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type DashboardWidget = {
  id: string;
  /** Nombre en el modo de edición. */
  label: string;
  /** Contenido ya resuelto en el servidor. */
  node: ReactNode;
  /** Columnas (de 12) que ocupa desde `lg` si la persona no eligió otro ancho. Por defecto, todo el ancho. */
  span?: Span;
  /** En pantallas chicas ocupa media fila (dos por fila) en vez de toda. */
  half?: boolean;
};

const storageKey = (scope: string) => `nx:dashboard:${scope}`;

function readLayout(scope: string, ids: string[]): DashboardLayout {
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    return normalizeLayout(raw ? JSON.parse(raw) : null, ids);
  } catch {
    return defaultLayout(ids);
  }
}

/**
 * Destino de un arrastre: el bloque bajo el cursor; con teclado (sin cursor), el
 * que contiene la esquina superior izquierda del bloque tomado; y, si nada,
 * el más cercano. Con bloques de distinto ancho `closestCenter` solo se queda
 * en el propio bloque.
 */
const collision: CollisionDetection = (args) => {
  const byPointer = pointerWithin(args);
  if (byPointer.length) return byPointer;
  const { collisionRect, droppableRects, droppableContainers, active } = args;
  const x = collisionRect.left + 8;
  const y = collisionRect.top + 8;
  const inside = droppableContainers.filter((c) => {
    const r = droppableRects.get(c.id);
    return c.id !== active.id && r && x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;
  });
  if (inside.length) return [{ id: inside[0].id }];
  return closestCenter(args);
};

/** ↑ ↓ pasan el bloque tomado al vecino (en vez de moverlo 25 px). */
const verticalCoordinates: KeyboardCoordinateGetter = (event, { context: { active, droppableRects, droppableContainers, collisionRect } }) => {
  if (!["ArrowUp", "ArrowDown"].includes(event.code) || !active || !collisionRect) return undefined;
  event.preventDefault();
  const items = droppableContainers
    .getEnabled()
    .map((c) => ({ id: c.id, rect: droppableRects.get(c.id) }))
    .filter((c): c is { id: typeof c.id; rect: NonNullable<typeof c.rect> } => Boolean(c.rect))
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
  const at = items.findIndex((c) => c.id === active.id);
  const next = items[Math.min(items.length - 1, Math.max(0, at + (event.code === "ArrowDown" ? 1 : -1)))];
  return next ? { x: next.rect.left, y: next.rect.top } : undefined;
};

type Corner = "tl" | "tr" | "bl" | "br";
const CORNERS: { id: Corner; className: string; label: string }[] = [
  { id: "tl", className: "-left-3 -top-3 cursor-nwse-resize", label: "superior izquierda" },
  { id: "tr", className: "-right-3 -top-3 cursor-nesw-resize", label: "superior derecha" },
  { id: "bl", className: "-bottom-3 -left-3 cursor-nesw-resize", label: "inferior izquierda" },
  { id: "br", className: "-bottom-3 -right-3 cursor-nwse-resize", label: "inferior derecha" },
];

function Item({
  widget,
  span,
  height,
  removable,
  hidden,
  editing,
  index,
  count,
  fresh,
  selected,
  onSelect,
  onMove,
  onToggle,
  onSpan,
  onHeight,
  onRemove,
}: {
  widget: DashboardWidget;
  span: Span;
  /** Alto en px si el bloque lo admite (gráficos agregados); `null` = alto natural. */
  height: number | null;
  removable: boolean;
  hidden: boolean;
  editing: boolean;
  index: number;
  count: number;
  fresh: boolean;
  selected: boolean;
  onSelect: () => void;
  onMove: (delta: -1 | 1) => void;
  onToggle: () => void;
  onSpan: (span: Span) => void;
  onHeight: (px: number) => void;
  onRemove: () => void;
}) {
  const drag = useDraggable({ id: widget.id });
  const drop = useDroppable({ id: widget.id });
  const rootRef = useRef<HTMLDivElement>(null);
  const { label } = widget;
  // Con el cursor o el dedo se toma el bloque entero tras mantenerlo presionado; el teclado
  // solo desde el asa (que Enter o Espacio en un enlace de dentro no inicien un arrastre).
  const { onKeyDown: _keys, ...pointerListeners } = (drag.listeners ?? {}) as Record<string, unknown>;
  void _keys;

  /** Esquinas: arrastrar cambia el ancho (se ajusta a las columnas) y, si admite alto, la altura. */
  function startResize(event: ReactPointerEvent<HTMLElement>, corner: Corner) {
    const el = rootRef.current;
    const grid = el?.parentElement;
    if (!el || !grid || event.button > 0) return;
    event.preventDefault();
    event.stopPropagation();
    const pointerId = event.pointerId;
    const gap = Number.parseFloat(getComputedStyle(grid).columnGap) || 14;
    const unit = (grid.clientWidth + gap) / COLS;
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = el.offsetWidth;
    const startHeight = height;
    let lastSpan: Span | null = null;
    let lastHeight: number | null = null;
    const minPx = unit * MIN_SPAN - gap;
    let livePx = startWidth;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      // El ancho sigue al puntero al píxel (fluido); la cuadrícula solo reserva las columnas que hacen falta.
      const dx = (corner[1] === "l" ? -1 : 1) * (ev.clientX - startX);
      livePx = Math.min(grid.clientWidth, Math.max(minPx, startWidth + dx));
      el.style.justifySelf = "start";
      el.style.width = `${livePx}px`;
      const reserve = Math.min(COLS, Math.max(MIN_SPAN, Math.ceil((livePx + gap) / unit)));
      if (reserve !== lastSpan) {
        lastSpan = reserve;
        onSpan(reserve);
      }
      if (startHeight != null) {
        const dy = (corner[0] === "t" ? -1 : 1) * (ev.clientY - startY);
        const next = clampHeight(startHeight + dy);
        if (next !== lastHeight) {
          lastHeight = next;
          onHeight(next);
        }
      }
    };
    // En la ventana, no en la esquina: el bloque puede cambiar de sitio en el DOM mientras se ajusta.
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      // Al soltar se asienta en la columna más cercana, con un deslizamiento corto en vez de un salto.
      const snapped = spanFromWidth(livePx + gap, unit);
      if (snapped !== lastSpan) onSpan(snapped);
      el.style.width = "";
      el.style.justifySelf = "";
      requestAnimationFrame(() => {
        const finalPx = el.offsetWidth;
        if (!motionOff() && Math.abs(finalPx - livePx) > 1) {
          el.animate([{ width: `${livePx}px` }, { width: `${finalPx}px` }], { duration: 140, easing: EASE_OUT });
        }
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function resizeKeys(event: React.KeyboardEvent) {
    const horizontal = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const vertical = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!horizontal && !(vertical && height != null)) return;
    event.preventDefault();
    if (horizontal) onSpan(stepSpan(span, horizontal as -1 | 1));
    if (vertical && height != null) onHeight(clampHeight(height + vertical * 24));
  }

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      data-widget={widget.id}
      style={{ ["--span" as string]: span }}
      // Sin arrastre nativo (enlaces e imágenes lo roban a dnd-kit y el bloque no se podía tomar).
      onDragStart={(event) => event.preventDefault()}
      {...pointerListeners}
      onPointerDown={(event) => {
        onSelect();
        (pointerListeners.onPointerDown as ((e: ReactPointerEvent<HTMLElement>) => void) | undefined)?.(event);
      }}
      className={cn(
        "group/widget relative min-w-0 transition-[opacity,outline-color] duration-200",
        widget.half ? "col-span-1" : "col-span-2",
        "lg:[grid-column:span_var(--span)]",
        !editing && "nx-rise empty:hidden",
        // El marco abraza al componente (no a su hueco): se toma desde cualquier punto.
        editing && "cursor-grab rounded-lg outline-2 outline-offset-2 outline-dashed outline-border-strong hover:z-(--z-sticky) hover:outline-border-input active:cursor-grabbing",
        editing && selected && "z-(--z-sticky) outline-solid outline-accent",
        fresh && "outline-solid outline-accent",
        // Tomado: su sitio queda vacío (hueco punteado) y los demás se acomodan alrededor.
        drag.isDragging && "bg-accent-subtle/40 outline-solid outline-accent",
      )}
    >
      {hidden ? null : (
        <div
          inert={editing || undefined}
          style={height != null ? { height } : undefined}
          className={cn("h-full [&>*]:h-full", editing && "pointer-events-none select-none", drag.isDragging && "invisible")}
        >
          {widget.node}
        </div>
      )}

      {/* Después del contenido: los bloques con posición propia (tarjetas) pintarían encima si fuera antes. */}
      {editing ? (
        <div
          className={cn(
            "absolute right-2 top-2 flex w-max max-w-[calc(100%-1rem)] cursor-default items-center gap-0.5 rounded-md border border-border bg-surface/95 px-1 py-0.5 shadow-(--shadow-popover) backdrop-blur-sm transition-opacity duration-150",
            // Tomado: la barra sigue montada (el asa del teclado es el activador del arrastre) pero oculta.
            drag.isDragging
              ? "pointer-events-none opacity-0"
              : selected
                ? "opacity-100"
                : "pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100 group-hover/widget:pointer-events-auto group-hover/widget:opacity-100",
          )}
        >
          <button
            type="button"
            ref={drag.setActivatorNodeRef}
            {...drag.listeners}
            {...drag.attributes}
            aria-label={`Arrastrar ${label}`}
            className="grid size-8 shrink-0 cursor-grab place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </button>
          <span className={cn("max-w-40 truncate px-1 text-[13px] font-semibold", span <= 4 && "sr-only")}>{label}</span>
          {span >= 48 ? (
            <Select
              aria-label={`Ancho de ${label}`}
              value={String(span)}
              onChange={(e) => isSpan(Number(e.target.value)) && onSpan(Number(e.target.value))}
              className="hidden h-8 w-36 text-[12.5px] lg:flex"
            >
              {(SPANS.includes(span as (typeof SPANS)[number]) ? SPANS : [...SPANS, span].sort((a, b) => a - b)).map((s) => (
                <option key={s} value={s}>{spanLabel(s)}</option>
              ))}
            </Select>
          ) : null}
          <Button variant="ghost" size="icon-sm" aria-label={`Subir ${label}`} disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp aria-hidden="true" className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Bajar ${label}`} disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown aria-hidden="true" className="size-4" />
          </Button>
          {removable ? (
            <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${label}`} onClick={onRemove}>
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          ) : (
            <Switch checked={!hidden} onCheckedChange={onToggle} aria-label={`Mostrar ${label}`} />
          )}
        </div>
      ) : null}

      {editing && selected && !drag.isDragging
        ? CORNERS.map((corner) => {
            const main = corner.id === "br";
            return (
              <span
                key={corner.id}
                role={main ? "slider" : undefined}
                tabIndex={main ? 0 : undefined}
                aria-hidden={main ? undefined : true}
                aria-label={main ? `Tamaño de ${label}` : undefined}
                aria-valuemin={main ? MIN_SPAN : undefined}
                aria-valuemax={main ? COLS : undefined}
                aria-valuenow={main ? span : undefined}
                aria-valuetext={main ? `${spanLabel(span)}. Usa las flechas para cambiar el tamaño.` : undefined}
                onPointerDown={(event) => startResize(event, corner.id)}
                // Ningún sensor de arrastre (ratón, dedo, teclado) debe ver estos gestos.
                onTouchStart={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={main ? resizeKeys : undefined}
                className={cn(
                  "absolute hidden size-4 touch-none rounded-[3px] border-2 border-accent bg-surface outline-none transition-transform duration-150 hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:block",
                  corner.className,
                )}
              />
            );
          })
        : null}
    </div>
  );
}

type DashboardActions = { editing: boolean; canAdd: boolean; onAdd: () => void; onEdit: () => void };
const DashboardActionsContext = createContext<DashboardActions | null>(null);

/**
 * Botón de tres puntos del inicio («Agregar» y «Editar diseño»). Va en el
 * encabezado de la página, junto al selector de periodo; lee las acciones del
 * `CustomizableDashboard` que lo contiene (por contexto, así el encabezado sigue
 * siendo del servidor). Fuera de un tablero no pinta nada.
 */
export function DashboardMenu({ className }: { className?: string }) {
  const actions = useContext(DashboardActionsContext);
  if (!actions) return null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Opciones del inicio" data-press="" className={className}>
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56 p-1.5">
        {actions.canAdd ? (
          <DropdownMenuItem onSelect={actions.onAdd} className="min-h-10 gap-2.5">
            <Plus aria-hidden="true" className="size-4" /> Agregar gráfico
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={actions.onEdit} disabled={actions.editing} className="min-h-10 gap-2.5">
          <Pencil aria-hidden="true" className="size-4" /> {actions.editing ? "Editando el diseño" : "Editar diseño"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Inicio personalizable de 12 columnas. No hay botón de «Personalizar»: **mantener
 * presionado** un bloque (350 ms con el cursor, 220 ms con el dedo) entra al modo
 * de edición y lo toma para ordenarlo. En edición (barra de edición, bloques con
 * borde discontinuo y esquinas) cada bloque se ordena arrastrándolo, cambia de
 * ancho (¼, ⅓, ½, ⅔ o todo, desde `lg`; en pantallas chicas es una sola columna)
 * arrastrando una esquina, y se muestra u oculta. «Agregar» abre un panel con
 * gráficos nuevos para añadir al inicio (cada uno también cambia de alto por las
 * esquinas y se puede quitar). Los cambios se ven en vivo y solo se guardan con
 * «Guardar»; «Cancelar» los descarta y «Restablecer» vuelve al diseño por
 * defecto. Sin arrastrar siempre hay alternativa: el botón «Editar diseño», el
 * selector de ancho, las flechas en la esquina y los botones Subir y Bajar.
 *
 * Los bloques del sistema se resuelven en el servidor: ocultar o mover no cambia
 * datos ni permisos. La preferencia está versionada (`lib/dashboard/layout.ts`) y
 * hoy se guarda por persona en este navegador (`localStorage`); pasarla a la base
 * de datos solo cambia dónde se guarda ese mismo objeto.
 */
export function CustomizableDashboard({
  scope,
  widgets,
  header,
  charts,
}: {
  /** Identifica la preferencia guardada (slug del negocio o `admin:<persona>`). */
  scope: string;
  widgets: DashboardWidget[];
  /** Encabezado fijo (saludo y periodo): no se mueve ni se oculta. */
  header: ReactNode;
  /** Gráficos que se pueden agregar: sus datos (del servidor) y cuáles ofrecer. Sin esto no hay «Agregar». */
  charts?: { data: ChartData; entries: readonly ChartEntry[]; subtitle?: string };
}) {
  const ids = widgets.map((w) => w.id);
  const idsKey = ids.join(",");
  const [saved, setSaved] = useState<DashboardLayout>(() => defaultLayout(ids));
  const [draft, setDraft] = useState<DashboardLayout | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeBox, setActiveBox] = useState<{ width: number; height: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [announce, setAnnounce] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const snapshot = useRef<DashboardLayout | null>(null); // diseño al tomar un bloque (Escape lo restaura)
  const lockUntil = useRef(0); // tras reacomodar, el reacomodo siguiente espera a que termine la animación
  const rects = useRef(new Map<string, { x: number; y: number }>());
  const suppressClick = useRef(false);
  const activeRef = useRef<string | null>(null);
  const pendingOver = useRef<{ over: string; timer: number } | null>(null);
  const editing = draft !== null;
  const layout = draft ?? saved;

  useEffect(() => {
    // Lee la preferencia tras montar: el servidor siempre pinta el orden por defecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(readLayout(scope, idsKey ? idsKey.split(",") : []));
  }, [scope, idsKey]);

  // El gráfico recién agregado se lleva a la vista y se resalta un momento.
  useEffect(() => {
    if (!freshId) return;
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-widget="${freshId}"]`);
    el?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    const timer = window.setTimeout(() => setFreshId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [freshId]);

  const sensors = useSensors(
    // Mantener presionado: 350 ms quieto (6 px de tolerancia) toma el bloque; un clic o un desplazamiento no.
    useSensor(PointerSensor, { activationConstraint: { delay: 350, tolerance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: verticalCoordinates }),
  );

  // Bloques del sistema (servidor) y gráficos agregados por la persona (cliente).
  const addedWidgets: DashboardWidget[] = layout.added.map((a) => ({
    id: a.id,
    label: entryOf(a.type).label,
    span: entryOf(a.type).span,
    node: charts ? <ChartWidget type={a.type} data={charts.data} subtitle={charts.subtitle} /> : null,
  }));
  const byId = new Map([...widgets, ...addedWidgets].map((w) => [w.id, w]));
  const labelOf = (id: unknown) => byId.get(String(id))?.label ?? "Bloque";
  const edit = useCallback((fn: (l: DashboardLayout) => DashboardLayout, message?: string) => {
    setDraft((d) => (d ? fn(d) : d));
    if (message) setAnnounce(message);
  }, []);

  function start() {
    setDraft((d) => d ?? saved);
    setAnnounce("Modo de edición activado");
  }
  function cancel() {
    setDraft(null);
    setAnnounce("Cambios descartados");
  }
  function save() {
    if (!draft) return;
    try {
      window.localStorage.setItem(storageKey(scope), JSON.stringify(draft));
    } catch {
      /* sin almacenamiento: el diseño vale para esta sesión */
    }
    setSaved(draft);
    setDraft(null);
    setAnnounce("Diseño guardado");
  }
  function add(type: ChartType) {
    const entry = entryOf(type);
    const { layout: next, id } = addWidget(layout, type, entry.span, entry.height);
    setDraft(next);
    setAdding(false);
    setFreshId(id);
    setAnnounce(`${entry.label} agregado al final de tu inicio. Pulsa Guardar para conservarlo.`);
  }

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    snapshot.current = draft ?? saved;
    suppressClick.current = true;
    setActiveId(id);
    setSelectedId(id);
    const box = event.active.rect.current.initial;
    setActiveBox(box ? { width: box.width, height: box.height } : null);
    start(); // mantener presionado un bloque entra al modo de edición
  }

  /** Como en la pantalla de inicio de un celular: al pasar sobre otro bloque, el tomado se coloca ahí y los demás se acomodan. */
  function reorder(active: string, over: string) {
    lockUntil.current = performance.now() + (motionOff() ? 0 : 220);
    setDraft((d) => {
      const to = d ? d.order.indexOf(over) : -1;
      return d && to >= 0 ? placeWidget(d, active, to) : d;
    });
  }

  function onDragOver(event: DragOverEvent) {
    const over = event.over ? String(event.over.id) : null;
    const active = String(event.active.id);
    activeRef.current = active;
    if (pendingOver.current) window.clearTimeout(pendingOver.current.timer);
    pendingOver.current = null;
    if (!over || over === active) return;
    const wait = lockUntil.current - performance.now();
    if (wait > 0) {
      // Aún acomodándose: se aplica al terminar la espera, si el puntero sigue sobre ese bloque.
      pendingOver.current = { over, timer: window.setTimeout(() => activeRef.current === active && reorder(active, over), wait) };
      return;
    }
    reorder(active, over);
  }

  function endDrag() {
    activeRef.current = null;
    if (pendingOver.current) window.clearTimeout(pendingOver.current.timer);
    pendingOver.current = null;
    setActiveId(null);
    setActiveBox(null);
    window.setTimeout(() => (suppressClick.current = false), 120); // el clic que sigue a soltar no navega
  }

  function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    endDrag();
    const at = layout.order.filter((o) => byId.has(o) && !layout.hidden.includes(o)).indexOf(id);
    setAnnounce(`${labelOf(id)} colocado en la posición ${at + 1}.`);
  }

  function onDragCancel() {
    endDrag();
    if (snapshot.current) setDraft(snapshot.current);
    setAnnounce("Movimiento cancelado");
  }

  // Los bloques se deslizan a su nuevo sitio (técnica FLIP: se mide antes y después y se anima la diferencia).
  // (Sin anchos ni altos: al ajustar el tamaño los vecinos fluyen con el puntero, sin animación aparte.)
  const orderKey = `${layout.order.join(",")}|${layout.hidden.join(",")}|${editing}`;
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const base = grid.getBoundingClientRect();
    const next = new Map<string, { x: number; y: number }>();
    grid.querySelectorAll<HTMLElement>("[data-widget]").forEach((el) => {
      const r = el.getBoundingClientRect();
      const pos = { x: r.left - base.left, y: r.top - base.top };
      const id = el.dataset.widget!;
      next.set(id, pos);
      const prev = rects.current.get(id);
      if (!prev || motionOff() || id === activeId) return;
      const dx = prev.x - pos.x;
      const dy = prev.y - pos.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration: 260, easing: EASE_OUT });
    });
    rects.current = next;
  }, [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${labelOf(active.id)}. Usa las flechas arriba y abajo para moverlo, Espacio para soltar y Escape para cancelar.`,
    onDragOver: ({ active, over }) => (over ? `${labelOf(active.id)} sobre ${labelOf(over.id)}.` : `${labelOf(active.id)} fuera de los bloques.`),
    onDragEnd: ({ active, over }) => (over ? `${labelOf(active.id)} soltado sobre ${labelOf(over.id)}.` : `${labelOf(active.id)} soltado sin cambios.`),
    onDragCancel: ({ active }) => `Cancelaste el movimiento de ${labelOf(active.id)}.`,
  };

  const hiddenWidgets = layout.order.filter((id) => layout.hidden.includes(id) && byId.has(id)).map((id) => byId.get(id)!);
  const visibleCount = layout.order.filter((id) => !layout.hidden.includes(id) && byId.has(id)).length;
  const addButton = charts ? (
    <Button variant={editing ? "outline" : "accent"} size="sm" onClick={() => setAdding(true)} data-press="">
      <Plus aria-hidden="true" className="size-3.5" />
      Agregar
    </Button>
  ) : null;

  return (
    <DashboardActionsContext.Provider value={{ editing, canAdd: Boolean(charts), onAdd: () => setAdding(true), onEdit: start }}>
    <div className="flex flex-col">
      {header}

      {editing ? (
        <section
          aria-label="Modo de edición del inicio"
          className="sticky top-[calc(var(--topbar-height)+env(safe-area-inset-top,0px)+8px)] z-(--z-sticky) mb-3.5 flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-surface px-3.5 py-2.5 shadow-(--shadow-popover)"
        >
          <LayoutDashboard aria-hidden="true" className="size-4 shrink-0 text-accent-text" />
          <p className="min-w-0 flex-1 text-[13px]">
            <b className="font-semibold">Editando tu inicio.</b>{" "}
            <span className="text-muted-foreground">Arrastra los bloques, cambia su tamaño por las esquinas u ocúltalos. Se ve en vivo; nada se guarda hasta que pulses «Guardar».</span>
          </p>
          {addButton}
          <Button variant="ghost" size="sm" disabled={!isCustomized(layout, ids)} onClick={() => edit(() => defaultLayout(ids), "Diseño por defecto restaurado (sin guardar)")}>
            <RotateCcw aria-hidden="true" className="size-3.5" /> Restablecer
          </Button>
          <Button variant="outline" size="sm" onClick={cancel}>
            <X aria-hidden="true" className="size-3.5" /> Cancelar
          </Button>
          <Button variant="accent" size="sm" onClick={save}>
            <Check aria-hidden="true" className="size-3.5" /> Guardar
          </Button>
          {hiddenWidgets.length > 0 ? (
            <div className="flex basis-full flex-wrap items-center gap-1.5 border-t border-border pt-2 text-[12.5px]">
              <span className="text-muted-foreground">Ocultos, para volver a mostrar:</span>
              {hiddenWidgets.map((w) => (
                <Button key={w.id} variant="outline" size="sm" onClick={() => edit((l) => toggleWidget(l, w.id), `${w.label}: visible`)}>
                  <Eye aria-hidden="true" className="size-3.5" /> {w.label}
                </Button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {!editing && visibleCount === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong px-4 py-10 text-center text-sm text-muted-foreground">
          No hay bloques visibles. Usa «Editar diseño» para mostrarlos de nuevo.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
          accessibility={{
            announcements,
            screenReaderInstructions: { draggable: "Para mover este bloque, pulsa Espacio, usa las flechas arriba y abajo y pulsa Espacio otra vez. También puedes usar los botones Subir y Bajar." },
          }}
        >
          <div
            ref={gridRef}
            // `dense`: un bloque más pequeño sube a rellenar el hueco que dejó otro (sin espacios en blanco).
            className="grid grid-cols-2 gap-3.5 [grid-auto-flow:dense] lg:[grid-template-columns:repeat(96,minmax(0,1fr))]"
            onPointerDown={(e) => e.target === e.currentTarget && setSelectedId(null)}
            onClickCapture={(e) => {
              if (!suppressClick.current) return;
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {layout.order
              .filter((id) => byId.has(id) && !layout.hidden.includes(id))
              .map((id, index, all) => {
                const widget = byId.get(id)!;
                const removable = layout.added.some((a) => a.id === id);
                const addedType = layout.added.find((a) => a.id === id)?.type;
                return (
                  <Item
                    key={id}
                    widget={widget}
                    span={layout.spans[id] ?? fromTwelfths(widget.span ?? 12)}
                    height={addedType ? (layout.heights[id] ?? entryOf(addedType).height) : null}
                    removable={removable}
                    hidden={layout.hidden.includes(id)}
                    editing={editing}
                    index={index}
                    count={all.length}
                    fresh={freshId === id}
                    selected={selectedId === id}
                    onSelect={() => setSelectedId(id)}
                    onMove={(delta) => edit((l) => moveWidget(l, id, delta), `${widget.label}: posición ${index + 1 + delta} de ${all.length}`)}
                    onToggle={() => edit((l) => toggleWidget(l, id), `${widget.label}: ${layout.hidden.includes(id) ? "visible" : "oculto"}`)}
                    onSpan={(s) => edit((l) => setSpan(l, id, s), `${widget.label}: ${spanLabel(s)}`)}
                    onHeight={(h) => edit((l) => setHeight(l, id, h))}
                    onRemove={() => edit((l) => removeWidget(l, id), `${widget.label} quitado`)}
                  />
                );
              })}
          </div>
          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
            {activeId && byId.get(activeId) ? (
              // El componente entero viaja con el cursor, con su mismo tamaño.
              <div
                inert
                style={activeBox ?? undefined}
                className="scale-[1.03] cursor-grabbing overflow-hidden rounded-lg opacity-95 outline-2 outline-accent shadow-(--nx-shadow-overlay) [&>*]:h-full"
              >
                {byId.get(activeId)!.node}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {charts ? <AddWidgetPanel open={adding} onOpenChange={setAdding} entries={charts.entries} onAdd={add} /> : null}

      <p role="status" className="sr-only">{announce}</p>
    </div>
    </DashboardActionsContext.Provider>
  );
}
