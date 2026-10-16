import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, type StatusTone } from "@/components/atoms/badge";
import { CountUp } from "@/components/atoms/count-up";
import { cn } from "@/lib/utils";

/**
 * Indicador compacto de un estado (Activas, Por vencer, Vencidas): badge con
 * el punto de estado, cifra Montserrat 24 px que cuenta y una nota. Los
 * estados que esperan acción (`pulse`) hacen latir el punto.
 */
export function StatTile({
  label,
  value,
  tone,
  pulse = false,
  note,
  href,
  index = 0,
  className,
}: {
  label: string;
  value: number | ReactNode;
  tone?: StatusTone;
  pulse?: boolean;
  note?: ReactNode;
  href?: string;
  index?: number;
  className?: string;
}) {
  const body = (
    <>
      <Badge tone={tone} pulse={pulse} className="self-start">
        {label}
      </Badge>
      <p className="font-display text-2xl font-semibold leading-none tabular-nums text-foreground">
        {typeof value === "number" ? <CountUp value={value} duration={1000} /> : value}
      </p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </>
  );
  const classes = cn(
    "nx-rise nx-spot relative flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3.5",
    href && "transition-colors duration-200 hover:border-border-input",
    className,
  );
  const style = { ["--i" as string]: index };
  return href ? (
    <Link href={href} className={classes} style={style} data-press="card">
      {body}
    </Link>
  ) : (
    <div className={classes} style={style}>
      {body}
    </div>
  );
}
