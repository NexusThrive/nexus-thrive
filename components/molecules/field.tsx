import { useId, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Campo de formulario: etiqueta (Inter 500 13 px), control, ayuda en muted y
 * error en rojo con icono. Conecta `id`, `aria-describedby` y `aria-invalid`
 * con el control que recibe por render prop, así cada formulario no repite
 * el cableado de accesibilidad.
 */
export function Field({
  label,
  hint,
  error,
  required,
  action,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Enlace a la derecha de la etiqueta (p. ej. "¿Olvidaste tu contraseña?"). */
  action?: ReactNode;
  className?: string;
  children: (control: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2.5">
        <label htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
          {required ? <span className="text-muted-foreground"> *</span> : null}
        </label>
        {action}
      </div>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
