import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** `text-2xs` y `text-ui` son tamaños de la escala (DR-02), no colores: sin esto `twMerge` los confundiría con `text-<color>`. */
const twMerge = extendTailwindMerge({ extend: { classGroups: { "font-size": [{ text: ["2xs", "ui"] }] } } });

/**
 * Une clases de Tailwind resolviendo conflictos con `tailwind-merge`.
 * (Convención shadcn/ui: los componentes de `components/ui` importan
 * `cn` desde `@/lib/utils`.)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Limita `n` al rango 0..1 (progresos y porcentajes de las cargas). */
export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
