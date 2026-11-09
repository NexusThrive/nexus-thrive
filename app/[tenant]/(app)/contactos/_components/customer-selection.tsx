"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

/**
 * Selección de filas de la lista de contactos, compartida entre la tabla (marca filas) y el panel de control (muestra
 * «N seleccionados» y el menú «Acciones» en lugar de la búsqueda). La selección se guarda junto a la vista (activos o
 * archivados) en la que se hizo: al cambiar de vista la anterior queda ignorada.
 */
export type BulkHandlers = { archive: () => void; restore: () => void; remove: () => void };
type Selection = { status: string; ids: Set<string> };

type Ctx = {
  selection: Selection;
  setSelection: (next: Selection | ((current: Selection) => Selection)) => void;
  /** La tabla registra sus acciones masivas (archivar, restaurar, eliminar). */
  register: (handlers: BulkHandlers) => void;
  /** El panel de control ejecuta una acción registrada. */
  run: (action: keyof BulkHandlers) => void;
};

const SelectionContext = createContext<Ctx | null>(null);

export function CustomerSelectionProvider({ status, children }: { status: string; children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(() => ({ status, ids: new Set() }));
  const handlers = useRef<BulkHandlers | null>(null);
  const register = useCallback((next: BulkHandlers) => {
    handlers.current = next;
  }, []);
  const run = useCallback((action: keyof BulkHandlers) => handlers.current?.[action](), []);
  return <SelectionContext.Provider value={{ selection, setSelection, register, run }}>{children}</SelectionContext.Provider>;
}

export function useCustomerSelection(): Ctx {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useCustomerSelection debe usarse dentro de CustomerSelectionProvider.");
  return ctx;
}
