"use client";

import { useMemo, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/molecules/dropdown-menu";

/**
 * Columnas de la lista de contactos: cuáles se ven y de qué ancho, a gusto de cada persona (en su navegador: es una
 * preferencia de vista, no un dato del negocio). Sin almacenamiento, la lista usa las columnas y anchos por defecto.
 */
export type ColumnKey = "email" | "phone" | "next" | "owed" | "overdue" | "created" | "document" | "city" | "tags";
export type ColumnDef = { key: ColumnKey; label: string; width: number; hidden?: boolean };

/** Orden de las columnas después del nombre. Las ocultas por defecto se activan desde «Elegir columnas». */
export const COLUMNS: readonly ColumnDef[] = [
  { key: "email", label: "Correo electrónico", width: 280 },
  { key: "phone", label: "Teléfono", width: 150 },
  { key: "next", label: "Próxima cita", width: 170 },
  { key: "owed", label: "Por cobrar", width: 140 },
  { key: "overdue", label: "Vencido", width: 130, hidden: true },
  { key: "document", label: "NIT / documento", width: 150, hidden: true },
  { key: "city", label: "Ciudad", width: 150, hidden: true },
  { key: "tags", label: "Etiquetas", width: 200, hidden: true },
  { key: "created", label: "Registrado", width: 140 },
];
export const NAME_WIDTH = 260;
const MIN_WIDTH = 90;
const MAX_WIDTH = 640;

type Prefs = { hidden?: ColumnKey[]; shown?: ColumnKey[]; widths?: Partial<Record<ColumnKey | "name", number>> };
const KEY = "nexus.contactos.columnas.v1";
const EVENT = "nexus-contactos-columnas";

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}
function write(prefs: Prefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* sin almacenamiento: el cambio no se guarda */
  }
}
function parse(raw: string): Prefs {
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" ? (value as Prefs) : {};
  } catch {
    return {};
  }
}

const clamp = (width: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));

/** Columnas visibles y anchos actuales; `drag` muestra el ancho mientras se arrastra, sin escribir en cada movimiento. */
export function useColumnPrefs() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "{}");
  const prefs = useMemo(() => parse(raw), [raw]);
  const [drag, setDrag] = useState<{ key: ColumnKey | "name"; width: number } | null>(null);

  const isVisible = (column: ColumnDef) => (column.hidden ? (prefs.shown ?? []).includes(column.key) : !(prefs.hidden ?? []).includes(column.key));
  const visible = COLUMNS.filter(isVisible);
  const widthOf = (key: ColumnKey | "name") => (drag?.key === key ? drag.width : (prefs.widths?.[key] ?? (key === "name" ? NAME_WIDTH : COLUMNS.find((c) => c.key === key)!.width)));

  const toggle = (column: ColumnDef) => {
    if (column.hidden) {
      const shown = new Set(prefs.shown ?? []);
      if (shown.has(column.key)) shown.delete(column.key);
      else shown.add(column.key);
      write({ ...prefs, shown: [...shown] });
    } else {
      const hidden = new Set(prefs.hidden ?? []);
      if (hidden.has(column.key)) hidden.delete(column.key);
      else hidden.add(column.key);
      write({ ...prefs, hidden: [...hidden] });
    }
  };
  const setWidth = (key: ColumnKey | "name", width: number) => write({ ...prefs, widths: { ...prefs.widths, [key]: clamp(width) } });
  const reset = () => write({});

  return { visible, isVisible, widthOf, toggle, setWidth, reset, drag, setDrag };
}

/** Botón «Elegir columnas» (al final del encabezado): casillas para mostrar u ocultar columnas. */
export function ColumnChooser({ prefs }: { prefs: ReturnType<typeof useColumnPrefs> }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Elegir columnas" className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-56">
        <DropdownMenuLabel>Columnas</DropdownMenuLabel>
        {COLUMNS.map((column) => (
          <DropdownMenuCheckboxItem key={column.key} checked={prefs.isVisible(column)} onCheckedChange={() => prefs.toggle(column)} onSelect={(event) => event.preventDefault()}>
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={prefs.reset}>Restablecer columnas</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Asa para cambiar el ancho de una columna, en el borde derecho de su encabezado. Con el mouse se arrastra; con el teclado,
 * las flechas izquierda y derecha cambian el ancho de 16 en 16 px.
 */
export function ResizeHandle({ columnKey, label, prefs }: { columnKey: ColumnKey | "name"; label: string; prefs: ReturnType<typeof useColumnPrefs> }) {
  const width = prefs.widthOf(columnKey);
  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const start = width;
    const move = (e: globalThis.PointerEvent) => prefs.setDrag({ key: columnKey, width: clamp(start + e.clientX - startX) });
    const up = (e: globalThis.PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      prefs.setDrag(null);
      prefs.setWidth(columnKey, start + e.clientX - startX);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      prefs.setWidth(columnKey, width + (event.key === "ArrowRight" ? 16 : -16));
    }
  };
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Ancho de la columna ${label}`}
      aria-valuenow={width}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onClick={(event) => event.stopPropagation()}
      className="absolute inset-y-0 right-0 flex w-3 cursor-col-resize touch-none items-center justify-center outline-none after:h-4 after:w-px after:bg-border hover:after:w-0.5 hover:after:bg-accent focus-visible:after:w-0.5 focus-visible:after:bg-accent"
    />
  );
}
