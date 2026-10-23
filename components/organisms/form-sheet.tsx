"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/atoms/button";
import { Alert } from "@/components/molecules/alert";
import { focusFirstInvalid } from "@/components/molecules/field";
import { ResponsiveSheet, SheetCloseButton } from "./responsive-sheet";

/** Lo que devuelve el envío. `void` u `{ ok: true }` = guardado. */
export type FormSheetResult =
  | void
  | { ok: true; message?: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string | undefined> };

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /**
   * Guarda. Recibe los datos del formulario; si devuelve `{ ok: false }` el
   * panel sigue abierto, conserva lo escrito, muestra el mensaje arriba y
   * lleva el foco al primer campo inválido.
   */
  onSubmit: (formData: FormData) => Promise<FormSheetResult> | FormSheetResult;
  /** Después de guardar (avisar, refrescar). El panel ya se cerró. */
  onSuccess?: (result: { message?: string }) => void;
  submitLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  /** Botón de enviar en rojo (anular, dar de baja). */
  destructive?: boolean;
  /** Deshabilita el envío (p. ej. sin cambios). */
  submitDisabled?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Campos. Si es función recibe los errores por campo devueltos por el
   * servidor (`fieldErrors.nombre`) para pasarlos a cada `<Field error>`.
   */
  children: ReactNode | ((state: { fieldErrors: Record<string, string | undefined>; pending: boolean }) => ReactNode);
};

/**
 * Formulario en superficie: la misma pieza para crear o editar en un diálogo
 * (`FormDialog`) o en un panel lateral (`FormDrawer`). Resuelve lo que cada
 * formulario repetía a mano:
 *
 * - pie fijo con "Cancelar" y el botón de enviar (fuera del scroll);
 * - no se cierra mientras guarda (Escape, fondo, X y arrastre bloqueados);
 * - error general con `role="alert"` arriba y foco al primer campo inválido;
 * - lo escrito no se borra tras un error recuperable;
 * - al guardar se cierra y el foco vuelve al botón que lo abrió.
 *
 * Elegir diálogo o panel: docs/design/interaction-patterns.md.
 */
function FormSheet({
  variant,
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  onSuccess,
  submitLabel = "Guardar",
  pendingLabel = "Guardando…",
  cancelLabel = "Cancelar",
  destructive = false,
  submitDisabled = false,
  size,
  children,
}: FormSheetProps & { variant: "dialog" | "drawer" }) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const reset = () => {
    setError(null);
    setFieldErrors({});
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    reset();
    startTransition(async () => {
      let result: FormSheetResult;
      try {
        result = await onSubmit(data);
      } catch {
        result = { ok: false, message: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." };
      }
      if (result && result.ok === false) {
        setError(result.message ?? "Revisa los campos marcados.");
        setFieldErrors(result.fieldErrors ?? {});
        // Tras pintar los errores, al primer campo inválido.
        requestAnimationFrame(() => focusFirstInvalid(formRef.current));
        return;
      }
      onOpenChange(false);
      onSuccess?.({ message: result && "message" in result ? result.message : undefined });
    });
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={title}
      description={description}
      drawer={variant === "drawer"}
      size={size}
      busy={pending}
      footer={
        <>
          <SheetCloseButton asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {cancelLabel}
            </Button>
          </SheetCloseButton>
          <Button
            type="submit"
            form={formId}
            variant={destructive ? "danger" : "primary"}
            loading={pending}
            loadingText={pendingLabel}
            disabled={submitDisabled}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {typeof children === "function" ? children({ fieldErrors, pending }) : children}
      </form>
    </ResponsiveSheet>
  );
}

/** Crear o editar pocos campos sin salir de la pantalla (modal centrado en PC). */
export function FormDialog(props: FormSheetProps) {
  return <FormSheet variant="dialog" {...props} />;
}

/** Registro con varias secciones o que necesita el contexto de la página (panel lateral en PC). */
export function FormDrawer(props: FormSheetProps) {
  return <FormSheet variant="drawer" {...props} />;
}
