import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Check, CreditCard, Database, FileText, MapPin, MessageCircle, Plug, TriangleAlert, type LucideIcon } from "lucide-react";
import type { StatusTone } from "@/components/atoms/badge";
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

const KIND_ICON: Record<string, LucideIcon> = { "Cobros en línea": CreditCard, "Factura electrónica": FileText, "Presencia en línea": MapPin, Canales: MessageCircle, Datos: Database };

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
  logo,
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
  /** Logo de la herramienta (ruta en `public/`); sin él se usa el icono del tipo. */
  logo?: string;
  className?: string;
}) {
  const s = STATE[state];
  const Icon = KIND_ICON[kind] ?? Plug;
  const on = state === "connected";
  const bad = state === "attention";
  const sub = [kind, environment ? (environment === "production" ? "Producción" : "Pruebas") : null].filter(Boolean).join(" · ");
  const badge = on
    ? "bg-accent text-ink"
    : bad
      ? "bg-danger text-white"
      : "bg-surface-muted text-muted-foreground";
  return (
    <article
      title={`${maturity} · La gestiona ${managedBy}${lastChecked ? ` · ${lastChecked}` : ""}`}
      className={cn("flex h-full flex-col overflow-hidden rounded-3xl border", on ? "border-accent/30 bg-gradient-to-br from-accent-subtle/70 to-card" : "border-border/60 bg-card", className)}
    >
      <div className="flex flex-1 flex-col gap-3 p-5">
        <header className="flex items-start justify-between gap-3">
          <span aria-hidden="true" className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-foreground", on ? "bg-card shadow-sm" : "bg-surface-muted")}>
            {logo ? <Image src={logo} alt="" width={28} height={28} unoptimized className="size-7 object-contain" /> : <Icon className="size-5" strokeWidth={1.7} />}
          </span>
          <div className="flex flex-col items-end gap-1">
            <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-semibold", badge)}>
              {on ? <Check aria-hidden="true" className="size-3" strokeWidth={2.6} /> : bad ? <TriangleAlert aria-hidden="true" className="size-3" /> : null}
              {s.label}
            </span>
            {bad ? (
              <Link href={href} className="text-2xs font-semibold text-danger underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-ring">
                Corregir
              </Link>
            ) : null}
          </div>
        </header>
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold text-foreground">{name}</h3>
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
        {bad && error ? (
          <p role="status" className="rounded-2xl bg-danger-subtle px-4 py-2.5 text-xs text-foreground">
            {error}
          </p>
        ) : null}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
        {extra ? <div className="min-w-0 flex-1">{extra}</div> : <Link href={href} aria-label={actionLabel} title={actionLabel} className="grid size-9 place-items-center rounded-full text-foreground outline-none transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowUpRight aria-hidden="true" className="size-[18px]" />
        </Link>}
        {/* El interruptor refleja el estado real; se gestiona en la pantalla de la herramienta. */}
        <Link href={href} aria-label={`${name}: ${s.label}. Gestionar`} title="Gestionar" className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <span aria-hidden="true" className={cn("relative block h-6 w-11 rounded-full transition-colors", on ? "bg-success" : "bg-border-strong/60")}>
            <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
          </span>
        </Link>
      </footer>
    </article>
  );
}
