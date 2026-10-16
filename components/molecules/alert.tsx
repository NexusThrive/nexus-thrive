import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  danger: { icon: AlertTriangle, classes: "border-l-danger bg-danger-subtle text-danger" },
  success: { icon: CheckCircle2, classes: "border-l-success bg-success-subtle text-success" },
  warning: { icon: AlertTriangle, classes: "border-l-accent bg-warning text-warning-foreground" },
  info: { icon: Info, classes: "border-l-foreground bg-surface-muted text-foreground" },
} as const;

/**
 * Aviso en línea: borde izquierdo de 3 px del color del estado, fondo suave,
 * icono y texto. El título en tinta (`title`) y el detalle en el color del
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
      className={cn("flex items-start gap-2.5 rounded-md border-l-[3px] px-3 py-2.5 text-[13px]", classes, className)}
    >
      <Icon aria-hidden="true" className="mt-px size-4 shrink-0" />
      <div className="min-w-0">
        {title ? <b className="block font-semibold text-foreground">{title}</b> : null}
        {children}
      </div>
    </div>
  );
}
