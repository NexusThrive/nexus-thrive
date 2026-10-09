import { cn } from "@/lib/utils";

/**
 * La N de NEXUS como patrón de carga (kit "Cargas de interfaz").
 * El trazo recorre el contorno en loop (spinner), avanza con progreso real
 * (`progress` 0..1) o se rellena al terminar (`done`).
 *
 * - `size` en px; el grosor del trazo se auto-ajusta con el tamaño.
 * - `phase="loop"`  → spinner indeterminado (celdas, tarjetas, botones).
 * - `phase="prog"`  → muestra `progress` (0..1) como porcentaje del trazo.
 * - `phase="done"`  → la N queda rellena (éxito).
 */

const N_PATH =
  "M394.83 874.18 L394.83 239.93 L699.27 239.93 L837.22 525.34 L864.18 511.07 L799.96 371.52 L799.96 239.93 L1129.79 239.93 L1129.79 874.18 L815.82 874.18 L704.04 614.93 L677.87 630.79 L725.44 741.77 L725.44 874.18 Z";

export type NLoaderPhase = "loop" | "prog" | "done";

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
  const strokeWidth = size <= 24 ? 44 : size <= 40 ? 32 : 22;
  const dash = phase === "prog" ? `${Math.max(0, Math.min(1, progress))} 1` : "0 1";

  return (
    <svg
      aria-hidden="true"
      viewBox="362 157 800 800"
      width={size}
      height={size}
      style={{ ["--nx-sw" as string]: strokeWidth }}
      className={cn(
        "nx-n",
        phase === "loop" && "loop",
        phase === "prog" && "prog",
        phase === "done" && "done",
        className,
      )}
    >
      <path className="o" d={N_PATH} />
      <path className="f" d={N_PATH} />
      <path
        className="t"
        d={N_PATH}
        pathLength={1}
        strokeDasharray={dash}
        strokeOpacity={phase === "prog" && progress > 0 ? 1 : undefined}
      />
    </svg>
  );
}

/** Texto con enfoque: cada letra entra saliendo del blur (como THRIVE). */
export function FocusText({
  text,
  className,
  delayMs = 14,
}: {
  text: string;
  className?: string;
  /** Retardo por carácter (ms). */
  delayMs?: number;
}) {
  return (
    <span className={cn("nx-fx", className)} aria-label={text}>
      <span className="line in">
        {text.split("").map((char, i) => (
          <span
            key={`${char}-${i}`}
            className="ch"
            aria-hidden="true"
            style={{ transitionDelay: `${i * delayMs}ms` }}
          >
            {char}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Cortes pulsantes: espera breve (respuestas, actualizaciones en línea). */
export function PulsingSlashes({ className }: { className?: string }) {
  return (
    <span className={cn("nx-sl", className)} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/** Barra de ruta indeterminada: navegación y procesos sin % conocido. */
export function IndeterminateBar({ className }: { className?: string }) {
  return (
    <div className={cn("nx-strip", className)} role="progressbar" aria-label="Cargando">
      <i className="nx-bar ind" />
    </div>
  );
}