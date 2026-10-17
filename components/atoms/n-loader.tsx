"use client";

/**
 * Alias de `NMark` con la API histórica (`phase` en lugar de `state`) que usa
 * la app en botones, buscadores y filtros. Para código nuevo, usar `NMark`.
 */
import { NMark, type NMarkState } from "@/components/atoms/n-mark";

export type NLoaderPhase = NMarkState;

export function NLoader({
  size = 24,
  phase = "loop",
  progress = 0,
  className,
}: {
  size?: number;
  phase?: NLoaderPhase;
  /** 0..1 — usado solo con phase="prog". */
  progress?: number;
  className?: string;
}) {
  return (
    <NMark size={size} state={phase} progress={progress} className={className} />
  );
}
