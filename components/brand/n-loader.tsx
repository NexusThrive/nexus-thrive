"use client";

/**
 * Compatibilidad: el spinner de marca vive ahora en `loaders.tsx` (NMark).
 * `NLoader` se conserva como alias de `NMark` para los puntos de la app que
 * ya lo importaban.
 */
import { NMark, type NMarkState } from "./loaders";

export { FocusText, PulsingSlashes, IndeterminateBar, NMark } from "./loaders";

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
