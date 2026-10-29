/**
 * Lecturas con contexto para el inicio: cada cifra responde ¿cuánto hay?, ¿cómo
 * va? y ¿qué puedo hacer? Reglas puras (sin React ni base de datos) para poder
 * probarlas; la página las llama con los datos reales del servidor.
 */
import { percentChange } from ".";

export type Comparison = {
  /** Variación % contra el periodo anterior; `null` si no hay base con qué comparar. */
  change: number | null;
  /** Texto corto que acompaña a la variación o explica por qué no hay. */
  note: string;
};

/** «vs. periodo anterior» o, sin base, «Sin variación disponible» (nunca un 0 % inventado). */
export function comparison(current: number, previous: number, versus: string): Comparison {
  const change = percentChange(current, previous);
  return change == null ? { change: null, note: "Sin variación disponible" } : { change, note: versus };
}

/** Flujo de caja del periodo: lo que entró menos lo que salió. */
export const cashFlow = (income: number, expenses: number): number => income - expenses;

/** «1 cobro registrado» / «6 cobros registrados» (o `none` si no hay). */
export function countLabel(count: number, one: string, many: string, none = "Sin movimientos"): string {
  if (count <= 0) return none;
  return `${count} ${count === 1 ? one : many}`;
}

const updatedFormat = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit", hour12: true });

/** «Actualizado a las 3:42 p. m.» (hora de Bogotá), para que se sepa qué tan fresco es el dato. */
export function updatedLabel(at: Date = new Date()): string {
  return `Actualizado a las ${updatedFormat.format(at).replace(/\s/g, " ")}`;
}
