"use client";

import { clamp01, cn } from "@/lib/utils";
import { N_PATH } from "@/components/atoms/n-path";

/* Cargas de interfaz NEXUS THRIVE (reference/nexus-loaders.html): todas nacen
   de la N. Los valores (ms, curvas, tamaños) son los de la referencia. */

/* --- NMark: base de todas las cargas -------------------------------------- */
export type NMarkState = "loop" | "prog" | "done";

export function NMark({
  size = 24,
  state = "loop",
  progress = 0,
  className,
}: {
  size?: number;
  state?: NMarkState;
  /** 0..1 (solo para state="prog"). */
  progress?: number;
  className?: string;
}) {
  const strokeWidth = size <= 24 ? 44 : size <= 40 ? 32 : 22;
  const dash = state === "prog" ? `${clamp01(progress)} 1` : undefined;

  return (
    <svg
      viewBox="362 157 800 800"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ ["--nx-sw" as string]: strokeWidth }}
      className={cn(
        "nx-n",
        state === "loop" && "loop",
        state === "prog" && "prog",
        state === "done" && "done",
        className,
      )}
    >
      <path className="o" d={N_PATH} />
      <path className="f" d={N_PATH} />
      <path className="t" d={N_PATH} pathLength={1} strokeDasharray={dash} />
    </svg>
  );
}

/* --- 1 · Spinner de marca ------------------------------------------------- */
export function BrandSpinner({
  size = 24,
  className,
  label = "Cargando",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-label={label} className={cn("inline-flex", className)}>
      <NMark size={size} state="loop" />
    </span>
  );
}
