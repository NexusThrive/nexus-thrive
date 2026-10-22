"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

/**
 * Confirmación de borrado de raíz.
 *
 * Eliminar un negocio se lleva sus clientes, su dinero, su asistencia, sus
 * proyectos y su equipo: es irreversible. Por eso no vale un clic: hay que
 * ESCRIBIR "eliminar". El servidor vuelve a comprobarlo (no basta con que el
 * formulario lo pida).
 */
export function DeleteBusinessDialog({
  open,
  onClose,
  businessName,
  onConfirm,
  description,
}: {
  open: boolean;
  onClose: () => void;
  businessName: string;
  onConfirm: (confirm: string) => Promise<{ ok: boolean; message?: string; total?: number }>;
  /** Qué se lleva por delante (para el texto). */
  description?: string;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) return null;

  const valid = text.trim().toLowerCase() === "eliminar";

  /** Cierra y deja el formulario como estaba. */
  const cerrar = () => {
    setText("");
    setError(null);
    onClose();
  };

  const confirm = () =>
    start(async () => {
      setError(null);
      const r = await onConfirm(text);
      if (!r.ok) {
        setError(r.message ?? "No se pudo eliminar.");
        return;
      }
      setText("");
      onClose();
    });

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-ink/70 p-4" role="dialog" aria-modal="true" aria-label="Eliminar negocio">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </span>
          <button type="button" onClick={cerrar} className="rounded-sm p-1 text-muted-foreground hover:text-foreground" aria-label="Cerrar">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <h2 className="mt-4 font-display text-lg font-bold tracking-tight">Eliminar {businessName}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {description ??
            "Se borra el negocio y todo lo que tiene dentro: clientes, membresías, dinero, asistencia, agenda, proyectos y tickets. No se puede deshacer."}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Las cuentas de tu equipo quedan libres: pueden entrar de nuevo y crear otro negocio.
        </p>

        <label className="mt-4 block">
          <span className="text-[13px] font-medium">
            Escribe <b className="font-mono">eliminar</b> para confirmar
          </span>
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            placeholder="eliminar"
            autoComplete="off"
            autoFocus
            className={cn(inputClasses, "mt-1.5 h-11 font-mono")}
          />
        </label>

        {error ? <p className="mt-2 text-[13px] text-destructive">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={cerrar} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!valid || pending}
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "bg-rose-600 text-white hover:bg-rose-700",
              !valid && "opacity-50",
            )}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" className="size-3.5" />
            )}
            {pending ? "Eliminando…" : "Eliminar definitivamente"}
          </button>
        </div>
      </div>
    </div>
  );
}
