"use client";

import { useRouter } from "next/navigation";
import { textareaClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { NOTE_MAX_LENGTH } from "@/lib/business/customers/customer-notes";
import { createCustomerNoteAction } from "@/app/[tenant]/(app)/contactos/[id]/actions";

/**
 * «Nueva nota» de un cliente en un modal (la misma acción de servidor de siempre): una observación interna que solo ve el equipo.
 * La usan el botón «Registrar nota» del historial y la pestaña Notas; al guardar avisa y refresca la ficha.
 */
export default function NoteDialog({ open, onOpenChange, tenantSlug, customerId, customerName }: { open: boolean; onOpenChange: (open: boolean) => void; tenantSlug: string; customerId: string; customerName: string }) {
  const router = useRouter();
  const { toast } = useToast();
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva nota"
      description={`Una observación interna sobre ${customerName}. Solo la ve tu equipo.`}
      submitLabel="Guardar nota"
      onSubmit={async (formData) => {
        formData.set("tenantSlug", tenantSlug);
        formData.set("customerId", customerId);
        const result = await createCustomerNoteAction({ status: "idle" }, formData);
        if (result.status === "ok") return { ok: true, message: result.message };
        const message = result.message ?? "No se pudo guardar la nota.";
        return { ok: false, message, fieldErrors: { content: message } };
      }}
      onSuccess={() => {
        toast("Nota registrada", "success");
        router.refresh();
      }}
    >
      {({ fieldErrors }) => (
        <Field label="Nota" hint={`Máximo ${NOTE_MAX_LENGTH} caracteres`} error={fieldErrors.content} required>
          {(control) => <textarea {...control} name="content" rows={5} maxLength={NOTE_MAX_LENGTH} data-autofocus="" placeholder="Ej. Prefiere citas en la tarde y pagar por transferencia." className={textareaClasses} />}
        </Field>
      )}
    </FormDialog>
  );
}
