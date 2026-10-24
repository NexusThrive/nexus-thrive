"use client";

/* eslint-disable react-hooks/refs -- useDraggable/useDroppable de dnd-kit devuelven refs de callback y listeners, no valores de ref; el lint los confunde. */

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
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
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { ArrowDown, ArrowUp, Check, GripVertical, LayoutDashboard, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Select } from "@/components/atoms/select";
import { Switch } from "@/components/atoms/switch";
import {
  SPANS,
  SPAN_LABEL,
  defaultLayout,
  isCustomized,
  isSpan,
  moveWidget,
  normalizeLayout,
  placeWidget,
  setSpan,
  toggleWidget,
  type DashboardLayout,
  type Span,
} from "@/lib/dashboard/layout";
import { cn } from "@/lib/utils";

export type DashboardWidget = {
  id: string;
  /** Nombre en el modo de edición. */
  label: string;
  /** Contenido ya resuelto en el servidor. */
  node: ReactNode;
  /** Columnas (de 12) que ocupa desde `lg` si la persona no eligió otro ancho. Por defecto, todo el ancho. */
  span?: Span;
};

const storageKey = (scope: string) => `nx:dashboard:${scope}`;

/** Clases estáticas (Tailwind no ve nombres armados con variables). */
const SPAN_CLASS: Record<Span, string> = {
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  6: "lg:col-span-6",
  8: "lg:col-span-8",
  12: "lg:col-span-12",
};

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

function Item({
  widget,
  span,
  hidden,
  editing,
  index,
  count,
  over,
  onMove,
  onToggle,
  onSpan,
}: {
  widget: DashboardWidget;
  span: Span;
  hidden: boolean;
  editing: boolean;
  index: number;
  count: number;
  over: boolean;
  onMove: (delta: -1 | 1) => void;
  onToggle: () => void;
  onSpan: (span: Span) => void;
}) {
  const drag = useDraggable({ id: widget.id, disabled: !editing });
  const drop = useDroppable({ id: widget.id, disabled: !editing });
  const { label } = widget;

  return (
    <div
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      className={cn(
        "col-span-1 min-w-0 transition-[opacity,outline-color] duration-200",
        SPAN_CLASS[span],
        !editing && "nx-rise empty:hidden",
        editing && "rounded-lg outline-2 -outline-offset-1 outline-dashed outline-border-strong",
        editing && over && "outline-solid outline-accent",
        drag.isDragging && "opacity-40",
      )}
    >
      {editing ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-t-lg bg-surface-muted px-2 py-1.5">
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
          <span className="min-w-24 flex-1 truncate text-[13px] font-semibold">{label}</span>
          <Select
            aria-label={`Ancho de ${label}`}
            value={String(span)}
            onChange={(e) => isSpan(Number(e.target.value)) && onSpan(Number(e.target.value) as Span)}
            className="hidden h-8 w-36 text-[12.5px] lg:flex"
          >
            {SPANS.map((s) => (
              <option key={s} value={s}>{SPAN_LABEL[s]}</option>
            ))}
          </Select>
          <Button variant="ghost" size="icon-sm" aria-label={`Subir ${label}`} disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp aria-hidden="true" className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Bajar ${label}`} disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown aria-hidden="true" className="size-4" />
          </Button>
          <Switch checked={!hidden} onCheckedChange={onToggle} aria-label={`Mostrar ${label}`} />
        </div>
      ) : null}

      {hidden ? (
        editing ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">Oculto: no aparece en tu inicio. Actívalo para mostrarlo.</p> : null
      ) : (
        <div inert={editing || undefined} className={cn(editing && "pointer-events-none select-none p-1 opacity-70")}>
          {widget.node}
        </div>
      )}
    </div>
  );
}

/**
 * Inicio personalizable de 12 columnas. «Personalizar» entra al **modo de
 * edición** (se nota: barra de edición, bloques con borde discontinuo y
 * controles); ahí cada bloque se arrastra (asa, teclado o botones ↑ ↓), se
 * ordena, cambia de ancho (¼, ⅓, ½, ⅔ o todo, desde `lg`; en pantallas chicas
 * es una sola columna) y se muestra u oculta. Los cambios se ven en vivo
 * (vista previa) y solo se guardan con «Guardar»; «Cancelar» los descarta y
 * «Restablecer» vuelve al diseño por defecto. Sin arrastrar siempre hay
 * alternativa (botones y selector de ancho).
 *
 * Los bloques se resuelven en el servidor: ocultar o mover no cambia datos ni
 * permisos. La preferencia está versionada (`lib/dashboard/layout.ts`) y hoy
 * se guarda por persona en este navegador (`localStorage`); pasarla a la base
 * de datos solo cambia dónde se guarda ese mismo objeto.
 */
export function CustomizableDashboard({
  scope,
  widgets,
  header,
}: {
  /** Identifica la preferencia guardada (slug del negocio o `admin:<persona>`). */
  scope: string;
  widgets: DashboardWidget[];
  /** Encabezado fijo (saludo y periodo): no se mueve ni se oculta. */
  header: ReactNode;
}) {
  const ids = widgets.map((w) => w.id);
  const idsKey = ids.join(",");
  const [saved, setSaved] = useState<DashboardLayout>(() => defaultLayout(ids));
  const [draft, setDraft] = useState<DashboardLayout | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const editing = draft !== null;
  const layout = draft ?? saved;

  useEffect(() => {
    // Lee la preferencia tras montar: el servidor siempre pinta el orden por defecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(readLayout(scope, idsKey ? idsKey.split(",") : []));
  }, [scope, idsKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: verticalCoordinates }),
  );

  const byId = new Map(widgets.map((w) => [w.id, w]));
  const labelOf = (id: unknown) => byId.get(String(id))?.label ?? "Bloque";
  const edit = useCallback((fn: (l: DashboardLayout) => DashboardLayout, message?: string) => {
    setDraft((d) => (d ? fn(d) : d));
    if (message) setAnnounce(message);
  }, []);

  function start() {
    setDraft(saved);
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

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setOverId(null);
    const to = event.over ? layout.order.indexOf(String(event.over.id)) : -1;
    if (to >= 0) edit((l) => placeWidget(l, String(event.active.id), to), `${labelOf(event.active.id)}: posición ${to + 1} de ${layout.order.length}`);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${labelOf(active.id)}. Usa las flechas arriba y abajo para moverlo, Espacio para soltar y Escape para cancelar.`,
    onDragOver: ({ active, over }) => (over ? `${labelOf(active.id)} sobre ${labelOf(over.id)}.` : `${labelOf(active.id)} fuera de los bloques.`),
    onDragEnd: ({ active, over }) => (over ? `${labelOf(active.id)} soltado sobre ${labelOf(over.id)}.` : `${labelOf(active.id)} soltado sin cambios.`),
    onDragCancel: ({ active }) => `Cancelaste el movimiento de ${labelOf(active.id)}.`,
  };

  const visibleCount = layout.order.filter((id) => !layout.hidden.includes(id) && byId.has(id)).length;

  return (
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
            <span className="text-muted-foreground">Arrastra los bloques, cambia su ancho u ocúltalos. Se ve en vivo; nada se guarda hasta que pulses «Guardar».</span>
          </p>
          <Button variant="ghost" size="sm" disabled={!isCustomized(layout, ids)} onClick={() => edit(() => defaultLayout(ids), "Diseño por defecto restaurado (sin guardar)")}>
            <RotateCcw aria-hidden="true" className="size-3.5" /> Restablecer
          </Button>
          <Button variant="outline" size="sm" onClick={cancel}>
            <X aria-hidden="true" className="size-3.5" /> Cancelar
          </Button>
          <Button variant="accent" size="sm" onClick={save}>
            <Check aria-hidden="true" className="size-3.5" /> Guardar
          </Button>
        </section>
      ) : (
        <div className="mb-3.5 flex justify-end">
          <Button variant="outline" size="sm" onClick={start} data-press="">
            <LayoutDashboard aria-hidden="true" className="size-3.5" />
            Personalizar
          </Button>
        </div>
      )}

      {!editing && visibleCount === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong px-4 py-10 text-center text-sm text-muted-foreground">
          No hay bloques visibles. Usa «Personalizar» para mostrarlos de nuevo.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragOver={(e) => setOverId(e.over ? String(e.over.id) : null)}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            setOverId(null);
          }}
          accessibility={{
            announcements,
            screenReaderInstructions: { draggable: "Para mover este bloque, pulsa Espacio, usa las flechas arriba y abajo y pulsa Espacio otra vez. También puedes usar los botones Subir y Bajar." },
          }}
        >
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
            {layout.order
              .filter((id) => byId.has(id) && (editing || !layout.hidden.includes(id)))
              .map((id, index, all) => {
                const widget = byId.get(id)!;
                return (
                  <Item
                    key={id}
                    widget={widget}
                    span={layout.spans[id] ?? widget.span ?? 12}
                    hidden={layout.hidden.includes(id)}
                    editing={editing}
                    index={index}
                    count={all.length}
                    over={overId === id && activeId !== id}
                    onMove={(delta) => edit((l) => moveWidget(l, id, delta), `${widget.label}: posición ${index + 1 + delta} de ${all.length}`)}
                    onToggle={() => edit((l) => toggleWidget(l, id), `${widget.label}: ${layout.hidden.includes(id) ? "visible" : "oculto"}`)}
                    onSpan={(s) => edit((l) => setSpan(l, id, s), `${widget.label}: ${SPAN_LABEL[s]}`)}
                  />
                );
              })}
          </div>
          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
            {activeId ? (
              <div className="rounded-md border border-border-strong bg-surface px-3 py-2 text-[13px] font-semibold shadow-(--nx-shadow-overlay)" style={{ "--i": 0 } as CSSProperties}>
                {labelOf(activeId)}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <p role="status" className="sr-only">{announce}</p>
    </div>
  );
}
