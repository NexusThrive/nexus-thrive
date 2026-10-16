import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Variación porcentual con flecha. `inverse` invierte el color (en gastos,
 * subir es malo). `null` = sin periodo previo con qué comparar.
 */
export function Delta({
  value,
  inverse = false,
  className,
}: {
  value: number | null;
  inverse?: boolean;
  className?: string;
}) {
  if (value == null) {
    return <span className={cn("text-xs text-muted-foreground", className)}>Sin periodo previo</span>;
  }
  if (value === 0) {
    return <span className={cn("text-xs font-semibold tabular-nums text-muted-foreground", className)}>= 0 %</span>;
  }
  const up = value > 0;
  const good = inverse ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
        good ? "text-success" : "text-danger",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {up ? "+" : "−"}
      {Math.abs(value)} %
    </span>
  );
}
