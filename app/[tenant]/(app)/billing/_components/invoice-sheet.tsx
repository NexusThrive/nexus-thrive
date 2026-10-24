"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { MoneyInput } from "@/components/molecules/money-input";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { amountInWords, invoiceTotal, type InvoiceKind } from "@/lib/business/invoice";
import { formatCurrency } from "@/lib/format";
import { createInvoiceAction } from "@/app/[tenant]/(app)/billing/actions";
import { Select } from "@/components/atoms/select";

type Line = { key: number; productId: string; description: string; quantity: string; unitPrice: number | null };
type Opt = { id: string; name: string; price?: number };

/** Nuevo recibo o cuenta de cobro: conceptos del catálogo o libres, total en números y en letras. */
export default function InvoiceSheet({ slug, customers, products, today, onClose }: { slug: string; customers: Opt[]; products: Opt[]; today: string; onClose: () => void }) {
  const [kind, setKind] = useState<InvoiceKind>("BILL");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerDoc, setCustomerDoc] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: "", description: "", quantity: "1", unitPrice: null }]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const parsed = lines.map((l) => ({ description: l.description, quantity: Number(l.quantity.replace(",", ".")) || 0, unitPrice: l.unitPrice ?? 0, productId: l.productId || null }));
  const total = invoiceTotal(parsed);
  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const save = () =>
    start(async () => {
      const r = await createInvoiceAction(slug, { kind, customerId, customerName, customerDoc, issueDate, dueDate, notes, lines: parsed });
      if (r.ok) {
        toast(r.message ?? "Creado", "success");
        router.push(`/${slug}/billing/${r.id}`);
      } else toast({ title: "No se creó", description: r.message, variant: "error" });
    });

  return (
    <ResponsiveSheet
      drawer
      size="lg"
      open
      onOpenChange={(o) => !o && onClose()}
      title={kind === "BILL" ? "Nueva cuenta de cobro" : "Nuevo recibo"}
      description="Numeración automática. Se imprime o guarda como PDF."
      footer={
        <>
          <span className="mr-auto self-center font-mono text-[15px] font-semibold tabular-nums">{formatCurrency(total)}</span>
          <button type="button" onClick={onClose} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={save} className={buttonVariants()}>
            {pending ? "Creando…" : "Crear"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <SegmentedControl ariaLabel="Tipo" value={kind} onChange={setKind} options={[{ value: "BILL", label: "Cuenta de cobro" }, { value: "RECEIPT", label: "Recibo" }]} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Cliente" className="sm:col-span-1">
            {(c) => (
              <Select {...c} value={customerId} onChange={(e) => { setCustomerId(e.target.value); setCustomerName(customers.find((x) => x.id === e.target.value)?.name ?? ""); }}>
                <option value="">Escribir a mano</option>
                {customers.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="A nombre de" required>{(c) => <input {...c} value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClasses} />}</Field>
          <Field label="NIT o cédula">{(c) => <input {...c} value={customerDoc} onChange={(e) => setCustomerDoc(e.target.value)} className={inputClasses} />}</Field>
          <Field label="Emisión">{(c) => <input {...c} type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputClasses} />}</Field>
          <Field label="Vence" hint="Opcional.">{(c) => <input {...c} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClasses} />}</Field>
        </div>

        <section className="grid gap-2">
          <h3 className="text-[13px] font-semibold">Conceptos</h3>
          {lines.map((l, i) => (
            <div key={l.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-border p-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_80px_150px_auto] sm:items-end">
              <label className="grid gap-1 text-xs font-medium max-sm:col-span-2">
                Del catálogo
                <Select
                  value={l.productId}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    setLine(l.key, { productId: e.target.value, description: p?.name ?? l.description, unitPrice: p?.price ?? l.unitPrice });
                  }}
                >
                  <option value="">Concepto libre</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-1 text-xs font-medium max-sm:col-span-2">
                Descripción
                <input value={l.description} onChange={(e) => setLine(l.key, { description: e.target.value })} className={inputClasses} />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Cant.
                <input inputMode="decimal" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} className={inputClasses} />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Valor unitario
                <MoneyInput value={l.unitPrice} onValueChange={(v) => setLine(l.key, { unitPrice: v })} />
              </label>
              <button type="button" aria-label={`Quitar concepto ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter((x) => x.key !== l.key))} className={buttonVariants({ variant: "ghost", size: "icon", className: "max-sm:col-start-2 max-sm:row-start-1" })}>
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setLines([...lines, { key: Date.now(), productId: "", description: "", quantity: "1", unitPrice: null }])} className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>
            <Plus aria-hidden="true" className="size-3.5" /> Agregar concepto
          </button>
          {total > 0 ? <p className="text-xs text-muted-foreground">Son: {amountInWords(total)}.</p> : null}
        </section>
        <Field label="Notas" hint="Datos de pago, condiciones…">
          {(c) => <textarea {...c} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClasses} placeholder="Consignar a la cuenta de ahorros Bancolombia 123-456789-00" />}
        </Field>
      </div>
    </ResponsiveSheet>
  );
}
