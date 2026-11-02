import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "./growth-line.module.css";

/** Escalones de la línea (x, y en una caja de 1200 × 240). Cada esquina es un hito del alta. */
const NODES = [
  [0, 228],
  [170, 228],
  [230, 196],
  [400, 196],
  [460, 158],
  [630, 158],
  [690, 116],
  [860, 116],
  [920, 70],
  [1090, 70],
  [1150, 22],
  [1200, 22],
] as const;
const PATH = NODES.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
const AREA = `${PATH} L1200 240 L0 240 Z`;
/** Hitos visibles: las esquinas donde la línea empieza a subir. */
const MILESTONES = [1, 3, 5, 7, 9, 11].map((i) => NODES[i]);

/**
 * La línea de crecimiento de NEXUS THRIVE: un trazo dorado en escalones que sube a medida que avanza el alta, desde el
 * registro hasta que el negocio existe. Es la espina visual de todo el recorrido (THRIVE = crecer): el mismo trazo en el
 * acceso, en cada pregunta, en el onboarding y en la creación, así el avance se *ve* como crecimiento. Decorativa
 * (`aria-hidden`); el progreso real se anuncia con texto en cada pantalla. Con movimiento reducido cambia sin animarse.
 */
export function GrowthLine({ progress, className }: { progress: number; className?: string }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div aria-hidden="true" className={cn(styles.root, className)} style={{ "--p": p } as CSSProperties}>
      <svg viewBox="0 0 1200 240" preserveAspectRatio="none" className={styles.svg}>
        <defs>
          <linearGradient id="nx-growth-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="nx-growth-clip">
            <rect className={styles.clip} x="0" y="0" height="240" />
          </clipPath>
        </defs>
        <path d={PATH} className={styles.track} vectorEffect="non-scaling-stroke" />
        <path d={AREA} fill="url(#nx-growth-fill)" clipPath="url(#nx-growth-clip)" />
        <path d={PATH} pathLength={1} className={styles.line} vectorEffect="non-scaling-stroke" />
      </svg>
      {MILESTONES.map(([x, y], i) => {
        const at = x / 1200;
        return (
          <span
            key={x}
            className={styles.node}
            data-on={p >= at - 0.001 ? "" : undefined}
            data-head={p >= at - 0.001 && (i === MILESTONES.length - 1 || p < MILESTONES[i + 1][0] / 1200 - 0.001) ? "" : undefined}
            style={{ left: `${(x / 1200) * 100}%`, top: `${(y / 240) * 100}%` }}
          />
        );
      })}
    </div>
  );
}
