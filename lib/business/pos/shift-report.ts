/** Turnos de caja (reglas puras): cómo se ve cada turno y cómo quedó su cuadre. */
export type ShiftRow = {
  id: string;
  terminalName: string;
  cashier: string;
  openedAt: string;
  closedAt: string | null;
  opening: number;
  expected: number | null;
  counted: number | null;
  difference: number | null;
  notes: string | null;
};

export type ShiftStatus = "open" | "balanced" | "over" | "short";

export function shiftStatus(s: Pick<ShiftRow, "closedAt" | "difference">): ShiftStatus {
  if (!s.closedAt) return "open";
  const d = s.difference ?? 0;
  return d === 0 ? "balanced" : d > 0 ? "over" : "short";
}

export const SHIFT_LABELS: Record<ShiftStatus, string> = { open: "Abierto", balanced: "Cuadrado", over: "Sobra", short: "Falta" };

/** Resumen de una lista de turnos cerrados: cuántos cuadraron y cuánto suman las diferencias. */
export function summarizeShifts(rows: readonly ShiftRow[]) {
  const closed = rows.filter((r) => r.closedAt);
  return {
    total: rows.length,
    open: rows.length - closed.length,
    balanced: closed.filter((r) => (r.difference ?? 0) === 0).length,
    over: closed.reduce((s, r) => s + Math.max(0, r.difference ?? 0), 0),
    short: closed.reduce((s, r) => s + Math.max(0, -(r.difference ?? 0)), 0),
  };
}
