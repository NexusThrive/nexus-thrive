"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { textareaClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { FormDialog } from "@/components/organisms/form-sheet";
import { suspendTenantAction, type AdminFormState } from "../actions";

const IDLE: AdminFormState = { status: "idle" };

/**
 * Diálogo de suspensión: el motivo es obligatorio (queda en el historial del
 * negocio y en la bitácora de auditoría). Al confirmar, el panel y la ficha
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

  return (
    <>
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>
        <ShieldAlert aria-hidden="true" />
        Suspender
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Suspender “${tenantName}”?`}
        description="El negocio deja de poder entrar a su espacio hasta que se reactive. El motivo queda en la auditoría."
        submitLabel="Suspender negocio"
        pendingLabel="Suspendiendo…"
        destructive
        onSubmit={async (formData) => {
          formData.set("tenantId", tenantId);
          const result = await suspendTenantAction(IDLE, formData);
          return result.status === "ok"
            ? { ok: true }
            : { ok: false, message: result.message ?? "No se pudo suspender el negocio." };
        }}
        onSuccess={() => onSuspended?.()}
      >
        <Field label="Motivo" required hint="Entre 5 y 300 caracteres. Lo verá el equipo en el historial.">
          {(control) => (
            <textarea
              {...control}
              name="reason"
              required
              minLength={5}
              maxLength={300}
              rows={3}
              placeholder="Ej. incumplimiento de pago, solicitud del cliente…"
              className={textareaClasses}
            />
          )}
        </Field>
      </FormDialog>
    </>
  );
}
