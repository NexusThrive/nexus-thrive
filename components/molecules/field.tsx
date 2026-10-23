import { useId, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Campo de formulario: etiqueta (Inter 500 13 px), control, descripción en
 * muted y error en rojo con icono. Conecta `id`, `aria-describedby`,
 * `aria-invalid` y `aria-required` con el control que recibe por render prop,
 * así cada formulario no repite el cableado de accesibilidad.
 *
 * - `hint` es la **descripción persistente**: lo que la persona necesita para
 *   llenar el campo. Sigue visible aunque haya error.
 * - `help` es ayuda **adicional** detrás del "?" (`ContextHelp`); nunca lo
 *   imprescindible.
 * - `required` marca con "*" (y "obligatorio" para lectores de pantalla);
 *   `optional` escribe "(opcional)" cuando lo raro es que no se pida.
 * - El error no depende solo del color: lleva icono y texto.
 */
export function Field({
  label,
  hint,
  help,
  error,
  required,
  optional,
  action,
  className,
  children,
}: {
  label: ReactNode;
  /** Descripción persistente debajo del control. */
  hint?: ReactNode;
  /** Ayuda contextual junto a la etiqueta: un `<ContextHelp>`. */
  help?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  /** Enlace a la derecha de la etiqueta (p. ej. "¿Olvidaste tu contraseña?"). */
  action?: ReactNode;
  className?: string;
  children: (control: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
    "aria-required"?: true;
  }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)} data-invalid={error ? "" : undefined}>
      <div className="flex min-h-6 items-center justify-between gap-2.5">
        <span className="flex items-center gap-1">
          <label htmlFor={id} className="text-[13px] font-medium text-foreground">
            {label}
            {required ? (
              <>
                <span aria-hidden="true" className="text-muted-foreground"> *</span>
                <span className="sr-only"> (obligatorio)</span>
              </>
            ) : optional ? (
              <span className="font-normal text-muted-foreground"> (opcional)</span>
            ) : null}
          </label>
          {help}
        </span>
        {action}
      </div>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
      })}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      {hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
    </div>
  );
}

/** Descripción persistente de un campo (cuando no se usa `Field`). */
export function FieldDescription({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <p id={id} className={cn("text-xs text-muted-foreground", className)}>
      {children}
    </p>
  );
}

/** Mensaje de error de un campo: icono + texto, nunca solo color. */
export function FieldError({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <p id={id} className={cn("flex items-start gap-1.5 text-xs text-danger", className)}>
      <AlertCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Lleva el foco al primer control inválido de un formulario (tras un envío
 * fallido). Busca `aria-invalid="true"` y, si no hay, `:invalid` nativo.
 */
export function focusFirstInvalid(root: HTMLElement | null) {
  if (!root) return;
  const target =
    root.querySelector<HTMLElement>('[aria-invalid="true"]') ?? root.querySelector<HTMLElement>(":invalid");
  target?.focus();
}
