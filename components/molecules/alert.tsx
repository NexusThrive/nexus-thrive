import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  danger: { icon: AlertTriangle, classes: "border-danger/20 bg-danger-subtle text-danger" },
  success: { icon: CheckCircle2, classes: "border-success/20 bg-success-subtle text-success" },
  warning: { icon: AlertTriangle, classes: "border-accent/30 bg-warning text-warning-foreground" },
  info: { icon: Info, classes: "border-border bg-surface-muted text-foreground" },
} as const;

/**
 * Aviso en línea: tarjeta suave (12 px) con fondo y borde tenue del color del estado,
 * icono y texto; sin franja lateral. El título en tinta (`title`) y el detalle en el color del
 * estado. Para errores de formulario y resultados de una acción.
 */
export function Alert({
  tone = "danger",
  title,
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, classes } = TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-ui", classes, className)}
    >
      <Icon aria-hidden="true" className="mt-px size-4 shrink-0" />
      <div className="min-w-0">
        {title ? <b className="block font-semibold text-foreground">{title}</b> : null}
        {children}
      </div>
    </div>
  );
}
