"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ConfirmDialog } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import { issueNoteAction, payInvoiceAction, voidInvoiceAction } from "@/app/[tenant]/(app)/billing/actions";
import type { DocumentView } from "@/lib/business/documents-db";
import { PAYMENT_METHODS } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";

type Small = "pay" | "void" | "credit" | "debit" | null;

/**
 * Acciones rápidas del visor: cada una abre un modal PEQUEÑO sobre el documento
 * (un par de campos), sin sacar a la persona de la vista completa.
 */
export default function DocumentActions({ slug, doc, canManage, canCharge, onChanged, onClosed }: { slug: string; doc: DocumentView; canManage: boolean; canCharge: boolean; onChanged: () => void; onClosed: () => void }) {
  const [open, setOpen] = useState<Small>(null);
  const { toast } = useToast();
  const isNote = doc.kind === "CREDIT_NOTE" || doc.kind === "DEBIT_NOTE";
  const canPay = canCharge && doc.status === "ISSUED" && (doc.kind === "BILL" || doc.kind === "RECEIPT");
  const canVoid = canManage && doc.status === "ISSUED" && !isNote && doc.paid === 0;
  const canNote = canManage && doc.status !== "VOID" && (doc.kind === "BILL" || doc.kind === "RECEIPT" || doc.kind === "SALE");
  const done = (message?: string) => {
    if (message) toast(message, "success");
    onChanged();
    onClosed();
  };
  return (
    <>
      {canPay ? <button type="button" onClick={() => setOpen("pay")} className={buttonVariants({ size: "sm" })}>Cobrar</button> : null}
      {canNote ? <button type="button" onClick={() => setOpen("credit")} className={buttonVariants({ variant: "outline", size: "sm" })}>Nota crédito</button> : null}
      {canNote ? <button type="button" onClick={() => setOpen("debit")} className={buttonVariants({ variant: "outline", size: "sm" })}>Nota débito</button> : null}
      {canVoid ? <button type="button" onClick={() => setOpen("void")} className={buttonVariants({ variant: "outline", size: "sm" })}>Anular</button> : null}

      <FormDialog
        open={open === "pay"}
        onOpenChange={(o) => !o && setOpen(null)}
        title="Cobrar"
        description={`${doc.code} · ${formatCurrency(doc.balance || doc.total)}`}
        submitLabel="Registrar cobro"
        pendingLabel="Cobrando…"
        onSubmit={async (d) => {
          const r = await payInvoiceAction(slug, doc.id, String(d.get("method") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {() => (
          <Field label="Medio de pago" required>
            {(c) => (
              <Select {...c} name="method" defaultValue="TRANSFER">
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            )}
          </Field>
        )}
      </FormDialog>

      <FormDialog
        open={open === "credit" || open === "debit"}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open === "debit" ? "Nota débito" : "Nota crédito"}
        description={open === "debit" ? `Suma un cargo al documento ${doc.code} (intereses, ajuste).` : `Baja lo cobrado en ${doc.code} (descuento posterior, error de precio).`}
        submitLabel={open === "debit" ? "Emitir nota débito" : "Emitir nota crédito"}
        pendingLabel="Emitiendo…"
        onSubmit={async (d) => {
          const amount = Number(String(d.get("amount") ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
          if (!(amount > 0)) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { amount: "Escribe un valor mayor que cero." } };
          const r = await issueNoteAction(slug, { documentId: doc.id, kind: open === "debit" ? "DEBIT_NOTE" : "CREDIT_NOTE", concept: String(d.get("concept") ?? ""), amount, taxRatePct: Number(String(d.get("tax") ?? "0").replace(",", ".")) || 0, reason: String(d.get("reason") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Concepto" required>{(c) => <input {...c} name="concept" autoComplete="off" className={inputClasses} placeholder={open === "debit" ? "Intereses de mora" : "Descuento por pronto pago"} />}</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (antes de impuestos)" required error={fieldErrors.amount}>{(c) => <input {...c} name="amount" inputMode="decimal" autoComplete="off" className={inputClasses} />}</Field>
              <Field label="IVA %" optional>{(c) => <input {...c} name="tax" inputMode="decimal" autoComplete="off" defaultValue="0" className={inputClasses} />}</Field>
            </div>
            <Field label="Motivo" required>{(c) => <input {...c} name="reason" autoComplete="off" maxLength={200} className={inputClasses} />}</Field>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={open === "void"}
        onOpenChange={(o) => !o && setOpen(null)}
        title="Anular documento"
        description={`${doc.code} quedará anulado y no se podrá cobrar. Esto no se puede deshacer.`}
        confirmLabel="Anular"
        tone="danger"
        onConfirm={async () => {
          const r = await voidInvoiceAction(slug, doc.id, "Anulado desde el visor");
          if (!r.ok) {
            toast(r.message, "error");
            return;
          }
          done(r.message);
        }}
      />
    </>
  );
}
