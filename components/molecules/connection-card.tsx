import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Badge, StatusDot, type StatusTone } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";

/**
 * Ficha de una herramienta externa (patrón «Conexión», DR-47, `10` §3.2): un mismo contenedor para todo lo que el negocio
 * puede conectar. Muestra el estado **real** de la conexión con texto + icono + color, el entorno (pruebas o producción),
 * la madurez de la función (disponible, en prueba, en plan), la última verificación, el último error con qué hacer,
 * quién puede gestionarla y el acceso a su pantalla de trabajo. No gestiona la conexión: lleva a donde se gestiona.
 */
export type ConnectionState = "connected" | "disconnected" | "attention" | "manual";
export type Maturity = "Disponible" | "En prueba" | "En plan";

const STATE: Record<ConnectionState, { label: string; tone: StatusTone }> = {
  connected: { label: "Conectado", tone: "success" },
  disconnected: { label: "Desconectado", tone: "muted" },
  attention: { label: "Requiere atención", tone: "danger" },
  manual: { label: "Uso manual", tone: "neutral" },
};

export function ConnectionCard({
  name,
  kind,
  description,
  state,
  maturity,
  environment,
  lastChecked,
  error,
  managedBy,
  href,
  actionLabel,
  extra,
  className,
}: {
  name: string;
  /** Tipo de herramienta: «Cobros en línea», «Factura electrónica»… */
  kind: string;
  description: string;
  state: ConnectionState;
  maturity: Maturity;
  environment?: "sandbox" | "production";
  /** Texto ya formateado: «Verificado hoy a las 3:00 p. m.»; sin dato, «Sin verificar». */
  lastChecked?: string;
  /** Último error: qué pasó y qué hacer. Solo se muestra en `attention`. */
  error?: string | null;
  /** «Dueño o Administración», derivado de la matriz de permisos. */
  managedBy: string;
  href: string;
  actionLabel: string;
  extra?: ReactNode;
  className?: string;
}) {
  const s = STATE[state];
  return (
    <article className={cn("flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4", className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground">{name}</h3>
          <p className="text-xs text-muted-foreground">{kind}</p>
        </div>
        <Badge>
          <StatusDot tone={s.tone} />
          {s.label}
        </Badge>
      </header>

      <p className="text-ui text-muted-foreground">{description}</p>

      {state === "attention" && error ? (
        <p role="status" className="rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2 text-xs text-foreground">
          {error}
        </p>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Madurez</dt>
        <dd className="text-foreground">{maturity}</dd>
        {environment ? (
          <>
            <dt className="text-muted-foreground">Entorno</dt>
            <dd className="text-foreground">{environment === "production" ? "Producción" : "Pruebas"}</dd>
          </>
        ) : null}
        {lastChecked ? (
          <>
            <dt className="text-muted-foreground">Verificación</dt>
            <dd className="text-foreground">{lastChecked}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">La gestiona</dt>
        <dd className="text-foreground">{managedBy}</dd>
      </dl>

      {extra}

      <div className="mt-auto pt-1">
        <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {actionLabel}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
