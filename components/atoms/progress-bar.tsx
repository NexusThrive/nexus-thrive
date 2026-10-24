import { cn } from "@/lib/utils";

/**
 * Barra de progreso NEXUS THRIVE: pista de 4 px `--border`, relleno tinta
 * (oro en curso) con el borde delantero cortado en diagonal. Nada de barras
 * verdes.
 */
export function ProgressBar({
  value,
  tone = "ink",
  label,
  className,
}: {
  /** 0..1 */
  value: number;
  tone?: "ink" | "gold";
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn("h-1 w-full bg-border", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <i
        className={cn("block h-full transition-[width] duration-[var(--d3)] ease-[var(--nx-ease-out)]", tone === "gold" ? "bg-gold-500" : "bg-foreground")}
        style={{
          width: `${pct}%`,
          clipPath: "polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)",
        }}
      />
    </div>
  );
}
