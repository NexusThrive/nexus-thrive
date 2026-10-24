"use client";

import { useCallback, useRef, useState, useTransition, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { IconTile } from "@/components/atoms/icon-tile";
import { inputClasses } from "@/components/atoms/input";
import { Alert } from "@/components/molecules/alert";
import { cn } from "@/lib/utils";
import { ResponsiveSheet, SheetCloseButton } from "./responsive-sheet";

export type ConfirmResult = void | boolean | { ok: boolean; message?: string };

/**
 * Confirmación de una acción (anular, eliminar, desactivar). Reemplaza a
 * `window.confirm`: tiene la marca, se lee bien en móvil, se anuncia como
 * diálogo y deja ver el error si la acción falla.
 *
 * - El foco inicial va al botón seguro ("Cancelar"); Enter no destruye nada.
 * - No se cierra mientras la acción está en curso.
 * - `confirmText`: hay que escribir esa palabra para habilitar el botón
 *   (borrados de raíz: un negocio entero).
 * - Si `onConfirm` devuelve `false` o `{ ok: false }`, sigue abierto y
 *   muestra el mensaje; si no, se cierra y el foco vuelve al botón de origen.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  pendingLabel = "Procesando…",
  cancelLabel = "Cancelar",
  tone = "danger",
  confirmText,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Detalle extra (qué se pierde, cuántos registros…). */
  children?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  /** `danger` para lo irreversible; `default` para confirmar algo reversible. */
  tone?: "danger" | "default";
  /** Palabra que hay que escribir para confirmar (p. ej. "eliminar"). */
  confirmText?: string;
  onConfirm: (typed: string) => Promise<ConfirmResult> | ConfirmResult;
}) {
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ready = !confirmText || typed.trim().toLowerCase() === confirmText.toLowerCase();

  const close = (next: boolean) => {
    if (!next) {
      setTyped("");
      setError(null);
    }
    onOpenChange(next);
  };

  const run = () =>
    startTransition(async () => {
      setError(null);
      let result: ConfirmResult;
      try {
        result = await onConfirm(typed);
      } catch {
        result = { ok: false, message: "No se pudo completar. Inténtalo de nuevo." };
      }
      if (result === false || (typeof result === "object" && result && !result.ok)) {
        setError((typeof result === "object" && result?.message) || "No se pudo completar.");
        return;
      }
      close(false);
    });

  return (
    <ResponsiveSheet
      unsavedGuard={false}
      open={open}
      onOpenChange={close}
      title={title}
      description={description}
      size="sm"
      busy={pending}
      footer={
        <>
          <SheetCloseButton asChild>
            <Button type="button" variant="outline" disabled={pending} data-autofocus={confirmText ? undefined : ""}>
              {cancelLabel}
            </Button>
          </SheetCloseButton>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            loading={pending}
            loadingText={pendingLabel}
            disabled={!ready}
            onClick={run}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {children ? (
          <div className="flex items-start gap-3">
            {tone === "danger" ? (
              <IconTile tone="danger">
                <TriangleAlert />
              </IconTile>
            ) : null}
            {children ? <div className="min-w-0 text-[13px] text-muted-foreground">{children}</div> : null}
          </div>
        ) : null}
        {confirmText ? (
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-foreground">
              Escribe <b className="font-mono">{confirmText}</b> para confirmar
            </span>
            <input
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && ready && !pending) run();
              }}
              placeholder={confirmText}
              autoComplete="off"
              spellCheck={false}
              data-autofocus=""
              className={cn(inputClasses, "font-mono")}
            />
          </label>
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </div>
    </ResponsiveSheet>
  );
}

type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  detail?: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "default";
};

/**
 * `window.confirm` con la marca y accesible, en una línea:
 *
 * ```tsx
 * const [confirm, confirmDialog] = useConfirm();
 * if (!(await confirm({ title: "¿Eliminar la partida?", confirmLabel: "Eliminar" }))) return;
 * …
 * return <>{…}{confirmDialog}</>;
 * ```
 *
 * Resuelve `true` al confirmar y `false` al cancelar. La acción en sí la hace
 * quien llama (con su propio estado de carga y su aviso).
 */
export function useConfirm() {
  // Las opciones se conservan al cerrar para que el texto no desaparezca
  // durante la animación de salida.
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false);
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
  };

  const element = (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          settle(false);
          setOpen(false);
        }
      }}
      title={options?.title ?? ""}
      description={options?.description}
      confirmLabel={options?.confirmLabel ?? "Confirmar"}
      tone={options?.tone}
      onConfirm={() => {
        settle(true);
      }}
    >
      {options?.detail}
    </ConfirmDialog>
  );

  return [confirm, element] as const;
}
