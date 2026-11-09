import type { VerticalValue } from "@/lib/core/sectors/verticals";
import type { ModuleValue } from "./modules";
import { SOLUTION_IDS, isCompatible, solutionForVertical, type SolutionId } from "./solutions";

/**
 * Asignación de la solución a cada negocio (HU-transicion-01, D-7). Por defecto sale del rubro; el Operations Center
 * puede fijarla a mano (queda en `Tenant.settings.solution`, sin migración) para los negocios híbridos. Nada se
 * migra ni se oculta: solo se decide cuál es la solución de referencia y se listan los casos que una persona debe revisar.
 */

/** Rubros cuya solución depende de cómo opera el negocio (Food «en su parte de comida», Museum «cuando es aforo y entradas», Gym «academias»). */
export const AMBIGUOUS_VERTICALS: readonly VerticalValue[] = ["hospitality", "education", "events"];

const isSolution = (value: unknown): value is SolutionId => typeof value === "string" && (SOLUTION_IDS as readonly string[]).includes(value);

/** Solución elegida a mano en los ajustes del negocio, o `null` si no hay. */
export function manualSolution(settings: unknown): SolutionId | null {
  const value = settings && typeof settings === "object" ? (settings as Record<string, unknown>).solution : null;
  return isSolution(value) ? value : null;
}

/** Solución efectiva: la fijada a mano o, si no hay, la del rubro. */
export function resolveSolution(vertical: VerticalValue | string | null | undefined, settings: unknown): { solution: SolutionId; source: "manual" | "auto" } {
  const manual = manualSolution(settings);
  return manual ? { solution: manual, source: "manual" } : { solution: solutionForVertical(vertical), source: "auto" };
}

/** Ajustes con la solución fijada (o quitada con `null`), conservando todo lo demás. */
export function withSolution(settings: unknown, solution: SolutionId | null): Record<string, unknown> {
  const base = settings && typeof settings === "object" && !Array.isArray(settings) ? { ...(settings as Record<string, unknown>) } : {};
  if (solution) base.solution = solution;
  else delete base.solution;
  return base;
}

export type Assessment = {
  solution: SolutionId;
  source: "manual" | "auto";
  /** Capacidades encendidas que la solución no admite: se conservan, pero piden revisión. */
  outside: ModuleValue[];
  /** ¿Una persona debe revisarlo? Solo los que no se revisaron a mano. */
  doubtful: boolean;
  reasons: string[];
};

/** Evalúa un negocio: su solución, lo que usa fuera de ella y si es un caso dudoso. */
export function assess(vertical: VerticalValue | string, settings: unknown, activeModules: readonly string[]): Assessment {
  const { solution, source } = resolveSolution(vertical, settings);
  const outside = activeModules.filter((m) => !isCompatible(solution, m as ModuleValue)) as ModuleValue[];
  const reasons: string[] = [];
  if (outside.length) reasons.push(`Usa ${outside.length === 1 ? "una función" : "funciones"} que su solución no trae: ${outside.join(", ")}.`);
  if (AMBIGUOUS_VERTICALS.includes(vertical as VerticalValue)) reasons.push("Su rubro puede ir en más de una solución según cómo opere.");
  return { solution, source, outside, doubtful: source === "auto" && reasons.length > 0, reasons };
}
