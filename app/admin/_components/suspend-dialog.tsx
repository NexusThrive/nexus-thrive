"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { suspendTenantAction, type AdminFormState } from "../actions";

const IDLE: AdminFormState = { status: "idle" };

/**
 * Diálogo de suspensión: el motivo es obligatorio (queda en el historial del
 * negocio y en la bitácora de auditoría). Al confirmar, el panel y el drawer
 * se refrescan.
 */
export default function SuspendDialog({
  tenantId,
  tenantName,
  onSuspended,
}: {
  tenantId: string;
  tenantName: string;
  onSuspended?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await suspendTenantAction(IDLE, formData);
      if (result.status === "ok") {
        setOpen(false);
        onSuspended?.();
      } else {
        setError(result.message ?? "No se pudo suspender el negocio.");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <ShieldAlert aria-hidden="true" />
        Suspender
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Suspender “{tenantName}”?</DialogTitle>
          <DialogDescription>
            El subdominio dejará de responder y la app quedará oculta en el
            host base. El motivo se registra en la auditoría.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-3">
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="space-y-1.5">
            <label
              htmlFor={`suspend-reason-${tenantId}`}
              className="text-sm font-medium"
            >
              Motivo
            </label>
            <textarea
              id={`suspend-reason-${tenantId}`}
              name="reason"
              required
              minLength={5}
              maxLength={300}
              rows={3}
              placeholder="Ej. incumplimiento de pago, solicitud del cliente…"
              className="w-full rounded-md border border-slate-200/80 bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>

          {error ? (
            <p role="alert" className="text-xs text-rose-600">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <ShieldAlert aria-hidden="true" />
              )}
              Suspender negocio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
