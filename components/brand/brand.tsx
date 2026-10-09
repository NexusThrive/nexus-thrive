import { cn } from "@/lib/utils";

/**
 * Marca NEXUS THRIVE: el bloque negro de la N (con el corte diagonal) y el
 * wordmark. La N usa el path geométrico del logo oficial; THRIVE usa la
 * fuente Public Stunt de la identidad.
 *
 * - `tone="on-ink"`  → para superficies oscuras (texto paper + oro).
 * - `tone="on-paper"` → para superficies claras (texto negro + grafito).
 */

const N_PATH =
  "M394.83 874.18 L394.83 239.93 L699.27 239.93 L837.22 525.34 L864.18 511.07 L799.96 371.52 L799.96 239.93 L1129.79 239.93 L1129.79 874.18 L815.82 874.18 L704.04 614.93 L677.87 630.79 L725.44 741.77 L725.44 874.18 Z";

export function LogoMark({
  className,
  inverse = false,
}: {
  className?: string;
  /** true = N en paper (para fondo ink). */
  inverse?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="380 230 770 660"
      className={cn("shrink-0", className)}
    >
      <path
        d={N_PATH}
        fill={inverse ? "var(--nx-paper)" : "var(--nx-ink)"}
      />
    </svg>
  );
}

export function Wordmark({
  className,
  tone = "on-paper",
}: {
  className?: string;
  tone?: "on-ink" | "on-paper";
}) {
  const onInk = tone === "on-ink";
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span
        className={cn(
          "nx-wordmark font-display text-[15px]",
          onInk ? "text-paper" : "text-ink",
        )}
      >
        NEXUS
      </span>
      <span
        className={cn(
          "font-stunt text-[13px] italic",
          onInk ? "text-gold-500" : "text-gold-600",
        )}
      >
        THRIVE
      </span>
    </span>
  );
}

export function Brand({
  className,
  tone = "on-paper",
  showMark = true,
}: {
  className?: string;
  tone?: "on-ink" | "on-paper";
  showMark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {showMark && (
        <LogoMark inverse={tone === "on-ink"} className="h-6 w-auto" />
      )}
      <Wordmark tone={tone} />
    </span>
  );
}